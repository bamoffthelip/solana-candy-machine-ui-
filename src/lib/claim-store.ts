/**
 * Persistent claim store: per-project mint counter + per-wallet claim guard.
 *
 * Two backends, selected automatically:
 * - Upstash Redis (when UPSTASH_REDIS_REST_URL/_TOKEN or KV_REST_API_URL/_TOKEN are set).
 *   This is the production path on Vercel (Vercel Marketplace KV uses Upstash).
 * - Local JSON file at `.data/claim-store.json` for `next dev` and single-instance hosts.
 *
 * The exported async API is the same regardless of backend, so callers
 * (`claim.ts`, the admin endpoint, the admin UI) don't change when you flip backends.
 */

import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

export type ProjectStats = {
  projectId: string;
  nextIndex: number | null;
  claimsCount: number;
};

interface ClaimBackend {
  hasWalletClaimed(projectId: string, walletAddress: string): Promise<boolean>;
  reserveClaim(
    projectId: string,
    walletAddress: string,
    startFrom: number
  ): Promise<{ metadataIndex: number }>;
  releaseReservation(projectId: string, walletAddress: string): Promise<void>;
  /** Remove wallet from claim guard only — does not change the mint counter. */
  removeClaimedWallet(projectId: string, walletAddress: string): Promise<boolean>;
  getProjectStats(projectId: string): Promise<ProjectStats>;
  listAllProjectStats(): Promise<ProjectStats[]>;
  listClaimedWallets(projectId: string): Promise<string[]>;
  resetProject(
    projectId: string,
    options: { counter?: boolean; claims?: boolean; nextIndex?: number }
  ): Promise<ProjectStats>;
}

// ---------- File backend (dev / single-instance) ----------

type ClaimState = {
  counters: Record<string, number>;
  claimsByProject: Record<string, string[]>;
};

class FileBackend implements ClaimBackend {
  private cache: ClaimState | null = null;
  private dataDir: string;
  private dataFile: string;

  constructor() {
    this.dataDir = process.env.CLAIM_STORE_DIR || path.join(process.cwd(), ".data");
    this.dataFile = path.join(this.dataDir, "claim-store.json");
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private load(): ClaimState {
    if (this.cache) return this.cache;
    this.ensureDir();
    if (!fs.existsSync(this.dataFile)) {
      this.cache = { counters: {}, claimsByProject: {} };
      return this.cache;
    }
    try {
      const raw = fs.readFileSync(this.dataFile, "utf8");
      const parsed = JSON.parse(raw) as Partial<ClaimState>;
      this.cache = {
        counters: parsed.counters ?? {},
        claimsByProject: parsed.claimsByProject ?? {},
      };
      return this.cache;
    } catch {
      this.cache = { counters: {}, claimsByProject: {} };
      return this.cache;
    }
  }

  private save(state: ClaimState): void {
    this.ensureDir();
    const tmp = `${this.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tmp, this.dataFile);
    this.cache = state;
  }

  async hasWalletClaimed(projectId: string, wallet: string): Promise<boolean> {
    return (this.load().claimsByProject[projectId] || []).includes(wallet);
  }

  async reserveClaim(
    projectId: string,
    wallet: string,
    startFrom: number
  ): Promise<{ metadataIndex: number }> {
    const state = this.load();
    const list = state.claimsByProject[projectId] || [];
    if (list.includes(wallet)) {
      throw new Error("This wallet has already claimed an NFT for this campaign.");
    }
    if (state.counters[projectId] === undefined) {
      state.counters[projectId] = startFrom;
    }
    const metadataIndex = state.counters[projectId];
    state.counters[projectId] = metadataIndex + 1;
    state.claimsByProject[projectId] = [...list, wallet];
    this.save(state);
    return { metadataIndex };
  }

  async releaseReservation(projectId: string, wallet: string): Promise<void> {
    const state = this.load();
    const list = state.claimsByProject[projectId] || [];
    state.claimsByProject[projectId] = list.filter((w) => w !== wallet);
    if (state.counters[projectId] !== undefined && state.counters[projectId] > 0) {
      state.counters[projectId] -= 1;
    }
    this.save(state);
  }

  async removeClaimedWallet(projectId: string, wallet: string): Promise<boolean> {
    const state = this.load();
    const list = state.claimsByProject[projectId] || [];
    if (!list.includes(wallet)) return false;
    state.claimsByProject[projectId] = list.filter((w) => w !== wallet);
    this.save(state);
    return true;
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const state = this.load();
    return {
      projectId,
      nextIndex: state.counters[projectId] ?? null,
      claimsCount: (state.claimsByProject[projectId] || []).length,
    };
  }

  async listAllProjectStats(): Promise<ProjectStats[]> {
    const state = this.load();
    const ids = new Set<string>([
      ...Object.keys(state.counters),
      ...Object.keys(state.claimsByProject),
    ]);
    return Promise.all(Array.from(ids).map((id) => this.getProjectStats(id)));
  }

  async listClaimedWallets(projectId: string): Promise<string[]> {
    return [...(this.load().claimsByProject[projectId] || [])];
  }

  async resetProject(
    projectId: string,
    options: { counter?: boolean; claims?: boolean; nextIndex?: number }
  ): Promise<ProjectStats> {
    const state = this.load();
    const { counter = true, claims = true, nextIndex } = options;
    if (counter) {
      if (typeof nextIndex === "number" && Number.isFinite(nextIndex) && nextIndex >= 0) {
        state.counters[projectId] = Math.floor(nextIndex);
      } else {
        delete state.counters[projectId];
      }
    }
    if (claims) {
      delete state.claimsByProject[projectId];
    }
    this.save(state);
    return this.getProjectStats(projectId);
  }
}

// ---------- Upstash Redis backend (production / Vercel) ----------

class RedisBackend implements ClaimBackend {
  private redis: Redis;
  private projectIndexKey = "claim:projects";

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private counterKey(projectId: string): string {
    return `claim:counter:${projectId}`;
  }
  private walletsKey(projectId: string): string {
    return `claim:wallets:${projectId}`;
  }

  async hasWalletClaimed(projectId: string, wallet: string): Promise<boolean> {
    const v = await this.redis.sismember(this.walletsKey(projectId), wallet);
    return v === 1;
  }

  /**
   * Atomic claim reservation via Lua:
   *   - reject if wallet already in set
   *   - initialize counter to startFrom if missing
   *   - increment and return new value-1 (the index assigned)
   *   - record wallet in set + project in projects index
   */
  async reserveClaim(
    projectId: string,
    wallet: string,
    startFrom: number
  ): Promise<{ metadataIndex: number }> {
    const script = `
      local walletsKey = KEYS[1]
      local counterKey = KEYS[2]
      local projectsKey = KEYS[3]
      local wallet = ARGV[1]
      local startFrom = tonumber(ARGV[2])
      local projectId = ARGV[3]

      if redis.call('SISMEMBER', walletsKey, wallet) == 1 then
        return -1
      end

      if redis.call('EXISTS', counterKey) == 0 then
        redis.call('SET', counterKey, startFrom)
      end

      local idx = tonumber(redis.call('GET', counterKey))
      redis.call('INCR', counterKey)
      redis.call('SADD', walletsKey, wallet)
      redis.call('SADD', projectsKey, projectId)
      return idx
    `;
    const result = (await this.redis.eval(
      script,
      [this.walletsKey(projectId), this.counterKey(projectId), this.projectIndexKey],
      [wallet, String(startFrom), projectId]
    )) as number;

    if (result === -1) {
      throw new Error("This wallet has already claimed an NFT for this campaign.");
    }
    return { metadataIndex: Number(result) };
  }

  async releaseReservation(projectId: string, wallet: string): Promise<void> {
    const pipe = this.redis.multi();
    pipe.srem(this.walletsKey(projectId), wallet);
    pipe.decr(this.counterKey(projectId));
    await pipe.exec();
  }

  async removeClaimedWallet(projectId: string, wallet: string): Promise<boolean> {
    const removed = await this.redis.srem(this.walletsKey(projectId), wallet);
    return Number(removed) > 0;
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const [counter, count] = await Promise.all([
      this.redis.get<string | number | null>(this.counterKey(projectId)),
      this.redis.scard(this.walletsKey(projectId)),
    ]);
    const nextIndex =
      counter === null || counter === undefined ? null : Number(counter);
    return {
      projectId,
      nextIndex: Number.isFinite(nextIndex as number) ? (nextIndex as number) : null,
      claimsCount: Number(count) || 0,
    };
  }

  async listAllProjectStats(): Promise<ProjectStats[]> {
    const ids = (await this.redis.smembers(this.projectIndexKey)) as string[];
    return Promise.all(ids.map((id) => this.getProjectStats(id)));
  }

  async listClaimedWallets(projectId: string): Promise<string[]> {
    const list = (await this.redis.smembers(this.walletsKey(projectId))) as string[];
    return list;
  }

  async resetProject(
    projectId: string,
    options: { counter?: boolean; claims?: boolean; nextIndex?: number }
  ): Promise<ProjectStats> {
    const { counter = true, claims = true, nextIndex } = options;
    const pipe = this.redis.multi();
    if (counter) {
      if (typeof nextIndex === "number" && Number.isFinite(nextIndex) && nextIndex >= 0) {
        pipe.set(this.counterKey(projectId), Math.floor(nextIndex));
      } else {
        pipe.del(this.counterKey(projectId));
      }
    }
    if (claims) {
      pipe.del(this.walletsKey(projectId));
    }
    await pipe.exec();
    return this.getProjectStats(projectId);
  }
}

// ---------- Backend selection ----------

function buildBackend(): ClaimBackend {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    return new RedisBackend(new Redis({ url, token }));
  }
  return new FileBackend();
}

const backend: ClaimBackend = buildBackend();

export const usingRedis: boolean =
  Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

// ---------- Public async API ----------

export function hasWalletClaimed(
  projectId: string,
  walletAddress: string
): Promise<boolean> {
  return backend.hasWalletClaimed(projectId, walletAddress);
}

export function reserveClaim(
  projectId: string,
  walletAddress: string,
  startFrom: number
): Promise<{ metadataIndex: number }> {
  return backend.reserveClaim(projectId, walletAddress, startFrom);
}

export function releaseReservation(
  projectId: string,
  walletAddress: string
): Promise<void> {
  return backend.releaseReservation(projectId, walletAddress);
}

/** Allow a wallet to claim again without changing nextIndex. Returns false if not in list. */
export function removeClaimedWallet(
  projectId: string,
  walletAddress: string
): Promise<boolean> {
  return backend.removeClaimedWallet(projectId, walletAddress);
}

export function getProjectStats(projectId: string): Promise<ProjectStats> {
  return backend.getProjectStats(projectId);
}

export function listAllProjectStats(): Promise<ProjectStats[]> {
  return backend.listAllProjectStats();
}

export function listClaimedWallets(projectId: string): Promise<string[]> {
  return backend.listClaimedWallets(projectId);
}

export function resetProject(
  projectId: string,
  options: { counter?: boolean; claims?: boolean; nextIndex?: number } = {}
): Promise<ProjectStats> {
  return backend.resetProject(projectId, options);
}
