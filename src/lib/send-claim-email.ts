/**
 * App-owned claim confirmation email via Resend.
 *
 * Crossmint native mint emails only fire when minting through Crossmint's Mint API
 * to an email recipient. This app mints on-chain (Bubblegum) to a wallet address, so
 * we send our own message after a successful Crossmint MPC claim.
 *
 * No-ops when RESEND_API_KEY / RESEND_FROM_EMAIL are unset (dev-friendly).
 * Never throws — claim success must not depend on email delivery.
 */

import { Resend } from "resend";
import { CROSSMINT_USER_COLLECTION_URL } from "./crossmint-links";
import { getProjectConfigOrFallback } from "./project-config";

export type ClaimEmailPayload = {
  to: string;
  nftName: string;
  projectId: string;
  walletAddress: string;
  assetId?: string;
  metadataIndex?: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_RE.test(value.trim()) && value.trim().length <= 254;
}

function appBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv.replace(/\/$/, "") : `https://${fromEnv.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** `reason` is set whenever `sent` is false. Flat shape: this project builds with strictNullChecks off. */
export type SendClaimEmailResult = {
  sent: boolean;
  id?: string;
  reason?: string;
};

/**
 * Sends claim-complete + wallet access email for Crossmint MPC claims.
 * Returns whether an email was sent; logs failures instead of throwing.
 */
export async function sendClaimCompleteEmail(
  payload: ClaimEmailPayload
): Promise<SendClaimEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = payload.to.trim().toLowerCase();

  if (!apiKey || !from) {
    return {
      sent: false,
      reason: "Resend not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)",
    };
  }
  if (!isValidEmail(to)) {
    return { sent: false, reason: "Invalid recipient email" };
  }

  const walletUrl = CROSSMINT_USER_COLLECTION_URL;
  const solscanAccount = `https://solscan.io/account/${payload.walletAddress}`;
  const solscanToken = payload.assetId
    ? `https://solscan.io/token/${payload.assetId}`
    : null;
  const claimPage = `${appBaseUrl()}/claim/${encodeURIComponent(payload.projectId)}`;

  const promoNote = getProjectConfigOrFallback(payload.projectId).promoNote;

  const subject = `Your ${payload.nftName} is ready`;
  const text = [
    `Your ${payload.nftName} has been claimed successfully.`,
    promoNote ? "" : null,
    promoNote || null,
    "",
    "Access your wallet anytime:",
    walletUrl,
    "",
    "Sign in to Crossmint with the same email or Google account you used to claim.",
    "",
    `Wallet address: ${payload.walletAddress}`,
    `View wallet on Solscan: ${solscanAccount}`,
    solscanToken ? `View NFT on Solscan: ${solscanToken}` : null,
    "",
    `Claim page: ${claimPage}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">Your NFT is ready</h1>
      <p style="margin: 0 0 16px;">
        <strong>${escapeHtml(payload.nftName)}</strong> has been claimed successfully.
      </p>
      ${
        promoNote
          ? `<p style="margin: 0 0 16px; font-size: 14px; color: #444;">${escapeHtml(promoNote)}</p>`
          : ""
      }
      <p style="margin: 0 0 8px;">Access your wallet anytime (bookmark this page):</p>
      <p style="margin: 0 0 16px;">
        <a href="${escapeAttr(walletUrl)}" style="color: #4f46e5;">Open Crossmint wallet</a>
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #444;">
        Sign in with the <strong>same email or Google</strong> you used to claim.
      </p>
      <p style="margin: 0 0 8px; font-size: 12px; color: #666; word-break: break-all;">
        Wallet: ${escapeHtml(payload.walletAddress)}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px;">
        <a href="${escapeAttr(solscanAccount)}" style="color: #4f46e5;">View this wallet on Solscan</a>
        ${
          solscanToken
            ? ` · <a href="${escapeAttr(solscanToken)}" style="color: #4f46e5;">View NFT on Solscan</a>`
            : ""
        }
      </p>
      <p style="margin: 24px 0 0; font-size: 12px; color: #888;">
        <a href="${escapeAttr(claimPage)}" style="color: #888;">Claim page</a>
      </p>
    </div>
  `.trim();

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html,
    });
    if (error) {
      console.error("[send-claim-email] Resend error:", error);
      return { sent: false, reason: error.message || "Resend API error" };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[send-claim-email] failed:", err);
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "Email send failed",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
