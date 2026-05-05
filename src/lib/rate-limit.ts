/**
 * Per-IP sliding-window rate limiter for `/api/claim`.
 *
 * Backends:
 * - Upstash Redis (production / Vercel) when UPSTASH_REDIS_REST_URL + _TOKEN are set
 *   (KV_REST_API_URL/_TOKEN also accepted).
 * - In-memory fallback for local dev (per-process, resets on restart).
 *
 * Env tuning:
 * - CLAIM_RATELIMIT_WINDOW_S    (default 60)  window size in seconds
 * - CLAIM_RATELIMIT_MAX_HITS    (default 5)   max requests per IP per window
 *
 * Usage:
 *   const { allowed, remaining, resetMs } = await checkClaimRateLimit(req);
 *   if (!allowed) return res.status(429).json({...});
 */

import type { NextApiRequest } from "next";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_SECONDS = Number(process.env.CLAIM_RATELIMIT_WINDOW_S || 60);
const MAX_HITS = Number(process.env.CLAIM_RATELIMIT_MAX_HITS || 5);

type Result = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  ip: string;
};

function getClientIp(req: NextApiRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0];
  }
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.length > 0) return real;
  return req.socket?.remoteAddress || "unknown";
}

let limiter: Ratelimit | null = null;
function getRedisLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_HITS, `${WINDOW_SECONDS} s`),
    analytics: false,
    prefix: "ratelimit:claim",
  });
  return limiter;
}

// In-memory fallback (best-effort; per process)
const memoryHits: Map<string, number[]> = new Map();
function memoryCheck(ip: string): Result {
  const now = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;
  const arr = (memoryHits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  memoryHits.set(ip, arr);
  const allowed = arr.length <= MAX_HITS;
  const remaining = Math.max(0, MAX_HITS - arr.length);
  const oldest = arr[0] ?? now;
  const resetMs = Math.max(0, windowMs - (now - oldest));
  return { allowed, remaining, resetMs, ip };
}

export async function checkClaimRateLimit(req: NextApiRequest): Promise<Result> {
  const ip = getClientIp(req);
  const r = getRedisLimiter();
  if (!r) {
    return memoryCheck(ip);
  }
  const { success, remaining, reset } = await r.limit(ip);
  return {
    allowed: success,
    remaining,
    resetMs: Math.max(0, reset - Date.now()),
    ip,
  };
}
