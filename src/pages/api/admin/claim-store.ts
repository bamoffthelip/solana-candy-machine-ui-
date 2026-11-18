import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/admin-auth";
import {
  getProjectStats,
  listAllProjectStats,
  listClaimedWallets,
  removeClaimedWallet,
  resetProject,
  usingRedis,
  type ProjectStats,
} from "../../../lib/claim-store";

type Ok = {
  success: true;
  backend: "redis" | "file";
  projectId?: string;
  stats?: ProjectStats;
  wallets?: string[];
  projects?: ProjectStats[];
  removed?: boolean;
  walletAddress?: string;
};

type Err = { success: false; error: string };

type ResponseData = Ok | Err;

/**
 * Admin endpoint: GET inspects, POST mutates.
 *
 * Auth: send CLAIM_ADMIN_KEY as `Authorization: Bearer <key>` or `x-admin-key`.
 *
 * GET  /api/admin/claim-store                       -> list all projects
 * GET  /api/admin/claim-store?projectId=<id>        -> single project stats
 * GET  /api/admin/claim-store?projectId=<id>&wallets=1
 *                                                   -> include claimed wallet list
 * POST /api/admin/claim-store
 *   body (reset — default when action omitted or "reset"): {
 *     projectId: string,
 *     action?: "reset",
 *     resetCounter?: boolean,   // default true
 *     resetClaims?: boolean,    // default true
 *     nextIndex?: number        // optional explicit starting index
 *   }
 *   body (remove one wallet from claim guard; does not change nextIndex): {
 *     projectId: string,
 *     action: "removeWallet",
 *     walletAddress: string
 *   }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (!requireAdmin(req, res)) return;

  try {
    const backend = usingRedis ? "redis" : "file";

    if (req.method === "GET") {
      const rawId = req.query.projectId;
      const projectId = typeof rawId === "string" && rawId.length > 0 ? rawId : null;
      const includeWallets = req.query.wallets === "1" || req.query.wallets === "true";

      if (!projectId) {
        const projects = await listAllProjectStats();
        return res.status(200).json({ success: true, backend, projects });
      }

      const stats = await getProjectStats(projectId);
      if (includeWallets) {
        const wallets = await listClaimedWallets(projectId);
        return res.status(200).json({ success: true, backend, projectId, stats, wallets });
      }
      return res.status(200).json({ success: true, backend, projectId, stats });
    }

    if (req.method === "POST") {
      const body = (req.body || {}) as {
        projectId?: string;
        action?: string;
        walletAddress?: string;
        resetCounter?: boolean;
        resetClaims?: boolean;
        nextIndex?: number;
      };

      const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
      if (!projectId) {
        return res.status(400).json({ success: false, error: "Missing projectId" });
      }

      const action = body.action === "removeWallet" ? "removeWallet" : "reset";

      if (action === "removeWallet") {
        const walletAddress =
          typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
        if (!walletAddress) {
          return res.status(400).json({
            success: false,
            error: "Missing walletAddress for action removeWallet",
          });
        }
        const removed = await removeClaimedWallet(projectId, walletAddress);
        const stats = await getProjectStats(projectId);
        const wallets = await listClaimedWallets(projectId);
        return res.status(200).json({
          success: true,
          backend,
          projectId,
          stats,
          wallets,
          removed,
          walletAddress,
        });
      }

      const stats = await resetProject(projectId, {
        counter: body.resetCounter !== false,
        claims: body.resetClaims !== false,
        nextIndex: body.nextIndex,
      });

      return res.status(200).json({ success: true, backend, projectId, stats });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Claim-store request failed";
    const cause =
      e instanceof Error && e.cause instanceof Error
        ? e.cause.message
        : e instanceof Error && e.cause
          ? String(e.cause)
          : null;
    // Upstash/KV client surfaces network/auth failures as opaque "fetch failed".
    const redisHint =
      usingRedis && /fetch failed|ENOTFOUND|ECONNREFUSED|401|403|Unauthorized/i.test(
        `${msg} ${cause || ""}`
      )
        ? " Redis/KV unreachable — check UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN) in Vercel Production, that the store is connected to this project, and redeploy."
        : "";
    return res.status(500).json({
      success: false,
      error: `${msg}${cause ? ` (${cause})` : ""}${redisHint}`,
    });
  }
}
