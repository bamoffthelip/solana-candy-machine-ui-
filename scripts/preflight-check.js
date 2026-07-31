#!/usr/bin/env node
/**
 * Preflight check — runs before `next build`.
 *
 * Behavior:
 * - In Vercel PRODUCTION (`VERCEL_ENV=production`): missing required env vars FAIL the build.
 * - In Vercel PREVIEW / local dev: prints warnings but does not fail.
 * - Always validates the target project config in `src/lib/project-config.ts` exists and
 *   has sane values (no leftover placeholder URIs).
 *
 * Skip entirely with `SKIP_PREFLIGHT=1` (for emergency deploys).
 *
 * Env references:
 *   PREFLIGHT_PROJECT_ID   default "unifygenesispromo" — project to sanity-check
 *   VERCEL_ENV             set by Vercel to "production" | "preview" | "development"
 */

/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

if (process.env.SKIP_PREFLIGHT === "1") {
  console.log("[preflight] SKIP_PREFLIGHT=1 set, skipping.");
  process.exit(0);
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";

const VERCEL_ENV = process.env.VERCEL_ENV || "";
const IS_VERCEL_PROD = VERCEL_ENV === "production";
const PROJECT_ID = process.env.PREFLIGHT_PROJECT_ID || "unifygenesispromo";

const errors = [];
const warnings = [];

function require_(name, hint) {
  const value = process.env[name];
  if (!value || value.length === 0) {
    (IS_VERCEL_PROD ? errors : warnings).push(
      `${name} is not set${hint ? ` — ${hint}` : ""}`
    );
    return null;
  }
  return value;
}

function recommend(name, hint) {
  const value = process.env[name];
  if (!value || value.length === 0) {
    warnings.push(`${name} is not set${hint ? ` — ${hint}` : ""}`);
    return null;
  }
  return value;
}

// ------- Required for the mint API to work at all -------
require_(
  "CNFT_AUTHORITY_SECRET_KEY",
  "server signer for cNFT mints (base58 secret key of collection authority)"
);
require_("CNFT_COLLECTION", "on-chain collection mint pubkey");
require_("CNFT_MERKLE_TREE", "Bubblegum merkle tree pubkey");
require_("CLAIM_ADMIN_KEY", "admin auth for /api/admin/* and /admin/*");

// ------- Recommended for prod -------
recommend("SOLANA_RPC_URL", "Helius or similar; public RPC will rate-limit under load");

// ------- Persistent claim store (Upstash / Vercel KV) -------
const hasUpstash =
  Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);
if (!hasUpstash) {
  (IS_VERCEL_PROD ? errors : warnings).push(
    "Upstash Redis env not set — the claim store will fall back to a local file, which does NOT persist on Vercel serverless. Add Vercel KV (Upstash Redis) integration or set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
  );
}

// ------- Optional Turnstile (both keys must be set together) -------
const tSecret = process.env.TURNSTILE_SECRET_KEY;
const tSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
if (tSecret && !tSite) {
  warnings.push(
    "TURNSTILE_SECRET_KEY is set but NEXT_PUBLIC_TURNSTILE_SITE_KEY is not — server will require a token no widget can produce. Set both, or unset both."
  );
} else if (!tSecret && tSite) {
  warnings.push(
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY is set but TURNSTILE_SECRET_KEY is not — widget shows on the page but the server won't verify tokens."
  );
}

// ------- Project config sanity check -------
const configPath = path.resolve(
  process.cwd(),
  "src",
  "lib",
  "project-config.ts"
);
try {
  const source = fs.readFileSync(configPath, "utf8");
  const idPattern = new RegExp(`${PROJECT_ID}\\s*:`);
  if (!idPattern.test(source)) {
    warnings.push(
      `Project "${PROJECT_ID}" is not defined in src/lib/project-config.ts. The claim page will fall back to a generic config.`
    );
  }
  if (source.includes("bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce")) {
    warnings.push(
      "Default placeholder metadata CID (bafybeih6h2...tce) is still referenced in project-config.ts. Ensure your project's `metadataBaseUri` points at the campaign's real IPFS/Arweave folder before launch."
    );
  }
  if (source.includes("images.unsplash.com/photo-1518546305927")) {
    warnings.push(
      "Default placeholder Unsplash image is still in project-config.ts. Set `mediaUrl` (or NEXT_PUBLIC_UNIFY_GENESIS_MEDIA) to your campaign artwork before launch."
    );
  }
} catch (e) {
  warnings.push(`Could not read ${configPath}: ${e && e.message ? e.message : e}`);
}

// ------- Report -------
const header = `${BOLD}${CYAN}[preflight]${RESET} project=${PROJECT_ID} vercelEnv=${VERCEL_ENV || "local"}\n`;
process.stdout.write(header);

if (warnings.length) {
  process.stdout.write(`${YELLOW}${BOLD}WARNINGS (${warnings.length})${RESET}\n`);
  for (const w of warnings) process.stdout.write(`  ${YELLOW}- ${w}${RESET}\n`);
}
if (errors.length) {
  process.stdout.write(`${RED}${BOLD}ERRORS (${errors.length})${RESET}\n`);
  for (const e of errors) process.stdout.write(`  ${RED}- ${e}${RESET}\n`);
  process.stdout.write(
    `\n${RED}${BOLD}Preflight failed.${RESET} Fix required env in Vercel → Settings → Environment Variables, then redeploy. ` +
      `To bypass in an emergency, set SKIP_PREFLIGHT=1.\n`
  );
  process.exit(1);
}
if (!warnings.length && !errors.length) {
  process.stdout.write(`${GREEN}OK — no issues detected.${RESET}\n`);
} else {
  process.stdout.write(`${GREEN}Preflight passed with warnings.${RESET}\n`);
}
process.exit(0);
