/**
 * Cloudflare Turnstile server-side verification.
 *
 * Activation:
 * - Set TURNSTILE_SECRET_KEY in env to enable enforcement.
 * - Optional NEXT_PUBLIC_TURNSTILE_SITE_KEY exposes the public site key to the client.
 * - When TURNSTILE_SECRET_KEY is unset, `verifyTurnstile` returns { ok: true, skipped: true }.
 *
 * Client should send the token (`cf-turnstile-response`) either in the request body as
 * `turnstileToken` or as the `x-turnstile-token` header.
 */

import type { NextApiRequest } from "next";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export function getTurnstileTokenFromRequest(req: NextApiRequest): string | null {
  const fromBody =
    typeof req.body === "object" && req.body !== null
      ? (req.body as Record<string, unknown>).turnstileToken
      : null;
  if (typeof fromBody === "string" && fromBody.length > 0) return fromBody;
  const header = req.headers["x-turnstile-token"];
  if (typeof header === "string" && header.length > 0) return header;
  return null;
}

export async function verifyTurnstile(
  token: string | null,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };

  if (!token) return { ok: false, error: "Missing Turnstile token" };

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);

    const resp = await fetch(VERIFY_URL, {
      method: "POST",
      body,
    });
    const data = (await resp.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (data.success) return { ok: true };
    return {
      ok: false,
      error: `Turnstile verification failed: ${(data["error-codes"] || []).join(", ") || "unknown"}`,
    };
  } catch (e: any) {
    return { ok: false, error: `Turnstile verification error: ${e?.message || "unknown"}` };
  }
}
