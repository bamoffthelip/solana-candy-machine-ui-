import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/admin-auth";
import {
  getProjectStats,
  listAllProjectStats,
  listClaimedWallets,
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
};

type Err = { success: false; error: string };

type ResponseData = Ok | Err;

/**
 * Admin endpoint: GET inspects, POST resets.
 *
 * Auth: send CLAIM_ADMIN_KEY as `Authorization: Bearer <key>` or `x-admin-key`.
 *
 * GET  /api/admin/claim-store                       -> list all projects
 * GET  /api/admin/claim-store?projectId=<id>        -> single project stats
 * GET  /api/admin/claim-store?projectId=<id>&wallets=1
 *                                                   -> include claimed wallet list
 * POST /api/admin/claim-store
 *   body: {
 *     projectId: string,
 *     resetCounter?: boolean,   // default true
 *     resetClaims?: boolean,    // default true
 *     nextIndex?: number        // optional explicit starting index
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
      const { projectId, resetCounter, resetClaims, nextIndex } = (req.body || {}) as {
        projectId?: string;
        resetCounter?: boolean;
        resetClaims?: boolean;
        nextIndex?: number;
      };

      if (!projectId || typeof projectId !== "string") {
        return res.status(400).json({ success: false, error: "Missing projectId" });
      }

      const stats = await resetProject(projectId, {
        counter: resetCounter !== false,
        claims: resetClaims !== false,
        nextIndex,
      });

      return res.status(200).json({ success: true, backend, projectId, stats });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Claim-store request failed";
    return res.status(500).json({ success: false, error: msg });
  }
}
