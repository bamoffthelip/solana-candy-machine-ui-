import { timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

/** `timingSafeEqual` throws unless both buffers are the same length, so lengths are checked first. */
function secretsMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }
  return timingSafeEqual(providedBytes, expectedBytes);
}

/**
 * Shared admin auth helper.
 * Set CLAIM_ADMIN_KEY (server-only env var) to a long random string, then send it
 * as either:
 *   - `Authorization: Bearer <key>` header, or
 *   - `x-admin-key: <key>` header.
 *
 * Returns true when the request is authorized; otherwise writes a 401/500 and
 * returns false (handler should `return` immediately if it returns false).
 */
export function requireAdmin(req: NextApiRequest, res: NextApiResponse): boolean {
  const expected = process.env.CLAIM_ADMIN_KEY?.trim();
  if (!expected) {
    res.status(500).json({
      success: false,
      error: "Server not configured: missing CLAIM_ADMIN_KEY",
    });
    return false;
  }

  const auth = req.headers["authorization"];
  const bearer =
    typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";

  const headerKey = req.headers["x-admin-key"];
  const provided = bearer || (typeof headerKey === "string" ? headerKey.trim() : "");

  if (!provided || !secretsMatch(provided, expected)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return false;
  }
  return true;
}
