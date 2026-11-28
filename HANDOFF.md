# Handoff — Unify cNFT claim platform

Operational notes for the claim system. Product vision lives in `context.md`;
this file covers how the thing actually runs and what state it is in.

Accurate as of 2026-11-25.

---

## Live surfaces

| Surface | URL |
|---|---|
| Production | `https://solana-candy-machine-ui.vercel.app` |
| Custom domain | `unifycrypto.net` (attached to Vercel, DNS cutover pending) |
| Claim page | `/claim/<projectId>` — e.g. `/claim/unify` |
| Mint page | `/mint/<projectId>` |
| Airdrop page | `/airdrop/<projectId>` |
| Admin | `/admin/claim-store` |

Hosting is Vercel (project `solana-candy-machine-ui`). Next.js Pages Router.
Files under `src/pages/` are thin re-exports; real code lives in
`src/ui/...` and `src/backend/...`.

---

## How a claim works

`POST /api/claim` → `src/backend/public-app/api/claim.ts`

1. Resolve `projectId` (defaults to `unify`) and the recipient. A
   `walletAddress` means the connected-wallet path; `mpcWalletAddress` means
   the Crossmint path.
2. Validate the recipient as a Solana public key.
3. `reserveClaim(projectId, recipient, startFrom, maxIndex)` atomically
   assigns a metadata index, rejecting repeat wallets and exhausted campaigns.
4. Mint a compressed NFT with Bubblegum `mintToCollectionV1`.
5. Resolve the asset ID from the transaction's tree leaf.
6. On the Crossmint path with an email present, send a confirmation via Resend.
7. If the mint throws, the reservation is released so the index is not burned.

Both the mint confirmation and the umi client use **`confirmed`**, not
`finalized`. This matters: `parseLeafFromMintToCollectionV1Transaction` calls
`getTransaction` without a commitment, so it inherits the connection default.
Leaving that at web3.js's `finalized` default stalls asset-ID resolution for
~13 seconds and can blow through the retry window.

---

## Campaigns

Defined in `src/lib/project-config.ts` as the `PROJECTS` record. Routing is
already dynamic, so **adding a key to that object creates a working campaign
at `/claim/<id>`** — no routing changes needed. Unknown ids fall back to a
generic config rather than 404ing.

Each campaign owns its title, description, media, attributes, metadata base
URI, name template, symbol, index range, and optionally its own
`collectionMint` and `merkleTree`.

Campaigns are isolated in the claim store: separate counters and separate
one-claim-per-wallet guards. Concurrent campaigns do not interfere, and one
person can claim once from each.

### Supply and metadata indexes

`defaultStartMetadataIndex` and `maxMetadataIndex` bound which
`{index}.json` files a campaign will mint. **These must match what is actually
pinned**, or you mint NFTs whose metadata URI 404s — permanently, in someone's
wallet.

Current state of the shared Unify metadata folder: indexes **13–200** exist.
`0.json` and `1.json` do not.

| Campaign | Range | Status |
|---|---|---|
| `unify` | 13–200 | matches the pinned folder |
| `unifygenesispromo` | 1–100 | pinned at `bafybeiahnrk4lf6dot7mrpye7526jsqg4nqu2wdxc63iyo34u44gx3egnq` via `NEXT_PUBLIC_UNIFY_GENESIS_METADATA_URI` |
| `demo` | starts at 0 | would mint dead metadata; do not use as-is |

An existing IPFS CID cannot gain files. Adding supply means pinning a new
folder and pointing the campaign at the new CID.

### Partner branding stays off-chain

`description` and `attributes` are written into NFT metadata. Partner or
meme-coin branding belongs in `promoNote` instead, which renders on the claim
page and in the claim email but never reaches metadata.

This is deliberate. Wallet spam filters read NFT metadata, and a flag can
follow the shared collection and creator address into every other campaign —
all campaigns currently mint under collection `DVaJS3…QsM` and creator
`66LDYvh9…fjtt`. A previous Epstain-branded drop was filtered and hidden by
Phantom, and it took months to diagnose. cNFT metadata also cannot be quietly
corrected afterwards.

If a campaign ever must carry partner branding on-chain, give it its own
collection NFT *and* its own mint authority wallet so a flag cannot reach the
main Unify collection.

---

## Claim store

`src/lib/claim-store.ts`, two interchangeable backends:

- **Upstash Redis** in production, selected when `KV_REST_API_URL`/`_TOKEN`
  (or `UPSTASH_REDIS_REST_URL`/`_TOKEN`) are present. Reservation runs as a
  Lua script so the counter, the wallet guard, and the supply cap are all
  checked atomically — concurrent claims cannot race past the cap.
- **JSON file** at `.data/claim-store.json` for local dev.

Local and production therefore hold completely separate claim state.

---

## Email

`src/lib/send-claim-email.ts`, via Resend. Sent only on the Crossmint path,
only when an email is known. It never throws — a failure is logged and
reported as `emailSent: false` rather than failing the claim.

Crossmint does **not** send its own email for these mints. Its
`sendNotification` only applies to mints through Crossmint's Mint API with
`email:<addr>:<chain>` recipients; this app mints on-chain to an address, so
app-owned email is the only option.

`unifycrypto.net` is verified in Resend, with DNS at Porkbun.

---

## Environment variables

Values live in Vercel and `.env.local` (gitignored). Never commit them.

| Variable | Purpose |
|---|---|
| `SOLANA_RPC_URL` | Server-side RPC for minting. **Not** `NEXT_PUBLIC_` — keep it off the client. |
| `CNFT_AUTHORITY_SECRET_KEY` | Mint authority. The most sensitive value here. |
| `CNFT_COLLECTION` / `CNFT_MERKLE_TREE` | Defaults when a campaign sets no override. |
| `CNFT_METADATA_URI` / `NEXT_PUBLIC_CNFT_METADATA_URI` | Default metadata folder. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis. |
| `CLAIM_ADMIN_KEY` | Admin auth, as `Authorization: Bearer` or `x-admin-key`. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email. |
| `NEXT_PUBLIC_APP_URL` | Base URL used in email links. Update at domain cutover. |
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` | Crossmint embedded auth. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | CAPTCHA — verified in `/api/claim` when secret is set. |

---

## Operations

Admin API, authenticated with `CLAIM_ADMIN_KEY`:

```bash
# campaign stats
GET  /api/admin/claim-store?projectId=unify
# include the claimed wallet list
GET  /api/admin/claim-store?projectId=unify&wallets=1
# let one wallet claim again (does not rewind the counter)
POST /api/admin/claim-store  {"projectId":"unify","action":"removeWallet","walletAddress":"..."}
# reset a campaign
POST /api/admin/claim-store  {"projectId":"unify","action":"reset"}
```

The UI at `/admin/claim-store` exposes the same operations, including a
per-wallet Remove button — the practical way to re-test a claim without
burning a fresh email address.

---

## Known gaps before a public launch

**`/api/claim` abuse protection is wired.** `checkClaimRateLimit` runs first
(429 + `Retry-After`), then `verifyTurnstile` (403 when
`TURNSTILE_SECRET_KEY` is set and the token is missing/invalid). Defaults:
5 hits / IP / 60s (`CLAIM_RATELIMIT_*`). After deploy, smoke-test one real
UI claim; a scripted `POST` with no token should 403 before the
duplicate-claim check.

Also outstanding:

- Genesis metadata is pinned
  (`bafybeiahnrk4lf6dot7mrpye7526jsqg4nqu2wdxc63iyo34u44gx3egnq`); confirm
  `NEXT_PUBLIC_UNIFY_GENESIS_METADATA_URI` is set in Vercel. Own collection
  NFT is still optional/outstanding.
  The Merkle tree does **not** need replacing — 16,334 of 16,384 slots are
  free, and a tree is shared storage independent of collection grouping.
- The mint authority wallet holds ~0.11 SOL. Enough to create a collection
  NFT, not enough to create a new tree.
- `/` is still the untouched `create-solana-dapp` scaffold page.

---

## Gotchas

- `tsconfig.json` sets `strictNullChecks: false`, which disables narrowing on
  boolean-discriminated unions. Prefer flat types with optional fields.
  Always run `npx tsc --noEmit` before deploying; the dev server will happily
  run code that fails the Vercel build.
- `package.json` declares `engines.node >= 20`, so Vercel auto-upgrades to
  each new Node major. Pin it if a build ever breaks unexpectedly.
- Local dev silently falls back to the public Solana RPC when
  `SOLANA_RPC_URL` is unset, so local success does not prove production works.
- A local claim is a **real mainnet mint**. Use the admin Remove button rather
  than minting fresh NFTs while testing.

---

## Incident log

**Nov 2026 — leaked RPC credential.** A Helius API key was hardcoded across 26
files on the public repo, including a documented curl example, and was
harvested. It consumed roughly 983k RPC credits plus Enhanced API and
LaserStream usage this codebase never calls, exhausting the monthly free tier
and taking production minting down. Resolved by revoking the key, removing it
from source, and deleting the browser-exposed `NEXT_PUBLIC_SOLANA_RPC_URL`
variable. Legitimate usage is ~7 credits per claim, so the 1M free tier covers
roughly 140,000 claims a month.

Lesson: keep RPC keys server-side only, and never let one reach a public repo
or a client bundle.
