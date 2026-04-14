Unify NFT Platform — context.md
🧭 Project Overview
Unify is a promotional NFT minting platform that enables businesses, creators, and communities to mint compressed NFTs (cNFTs) as low‑cost promotional items, digital collectibles, loyalty assets, and engagement tools.

Unify provides:

a cNFT minting pipeline

a business onboarding flow

a mint UI

metadata generation tools

an asset upload pipeline (Arweave or Shadow Drive)

airdrop tools

Crossmint MPC onboarding

optional business‑specific fungible tokens

a future shared Unify Token for platform utility

Unify is brand‑safe, scalable, and general‑purpose.
It is not tied to the Epstain meme coin, though Epstain holders may use the platform.

🎯 Primary Goals
Provide businesses with a simple way to mint promotional NFTs.

Enable large‑scale, low‑cost distribution using Solana cNFTs.

Offer a clean, modern mint UI for customers.

Support airdrops, campaigns, and promotional flows.

Build a foundation for future token‑routed commerce.

Maintain strict separation between Unify (platform) and any meme coin branding.

🧱 Core Features
1. cNFT Minting Pipeline
Uses UMI + Metaplex Core

Mints compressed NFTs

Supports batch minting

Supports airdrops

Uses a signer wallet or Crossmint MPC

2. Metadata Builder
JSON metadata generation

Business‑specific fields

Promotional attributes

Editioning support

Automatic URI injection

3. Asset Upload Pipeline
Supports:

Arweave

Shadow Drive

Includes:

bundling

upload receipts

retry logic

content hashing

4. Mint UI
Next.js frontend

Wallet connect (Solana wallets + Crossmint)

Mint button

Progress states

Success screen

Optional gating

5. Business Onboarding Flow
Create project

Upload media

Configure metadata

Configure mint settings

Preview

Publish mint page

6. Airdrop Tools
Bulk minting

Bulk sending

CSV wallet ingestion

Progress tracking

7. Future Token Layer
(Not implemented yet, but important context for Cursor.)

Unify Token (shared platform utility token)

Business Tokens (optional fungible tokens minted by businesses)

Smart Routing (future):

customers can pay with Unify Token, business tokens, or fiat

system handles conversion

every purchase generates on‑chain volume

Cursor should not implement token‑routed commerce unless explicitly instructed.

🧩 Technical Architecture
Solana Stack
UMI

Metaplex Core

Bubblegum (compression)

RPC provider (Helius recommended)

Crossmint MPC integration

Frontend
Next.js

React

Tailwind (optional)

Solana wallet adapter

Crossmint connect

Backend / Scripts
Node.js

TypeScript

Solana Web3

UMI

Arweave/Shadow Drive SDKs

## 📁 Recommended Repo Structure

```plaintext
/src
  /components
  /contexts
  /hooks
  /lib
  /pages
    /api
  /styles
  /types

/scripts
  mint-cnft.ts
  upload-assets.ts
  airdrop.ts
  generate-metadata.ts

/public
  /images
  /sample-assets

/context.md
/README.md
/package.json
/tsconfig.json
```

🧠 Development Guidelines for Cursor
These rules help Cursor generate consistent, safe code.

Never modify context.md unless explicitly asked.

Maintain the repo structure above.

Use TypeScript for all scripts and frontend code.

Use UMI + Metaplex Core for all cNFT operations.

Use Arweave or Shadow Drive for asset uploads.

Keep business logic modular and separated.

Avoid mixing Unify with WCS or Epstain code.  
These are separate projects.

When generating code:
prefer pure functions

avoid unnecessary dependencies

keep scripts idempotent

include comments for clarity

avoid hardcoding RPC URLs or private keys

When modifying multiple files:
Cursor should:

summarize planned changes

apply changes in small batches

avoid destructive refactors unless instructed

🧭 Future Roadmap (for context only)
Cursor should not implement these unless asked.

Phase 1 — Promotional NFTs
cNFT minting

metadata builder

upload pipeline

mint UI

airdrop tools

Phase 2 — Shared Unify Token
platform utility token

used for mint fees

used for premium features

Phase 3 — Business Tokens
optional fungible tokens

paired with Unify Token

used for loyalty + perks

Phase 4 — Smart Routing
customers pay with Unify Token, business tokens, or fiat

system handles conversion

every purchase generates on‑chain volume

🛑 Out of Scope
Cursor should not:

implement token‑routed commerce unless asked

mix Unify with WCS or DBT code

mix Unify with Epstain code

create regulatory language

create marketing copy

create whitepapers unless asked

🧩 How Cursor Should Use This File
Cursor should treat this file as the authoritative description of the Unify project.
When generating or modifying code, Cursor should:

follow the architecture described here

maintain the repo structure

avoid mixing unrelated projects

ask for clarification if a requirement is ambiguous

ensure all code aligns with the Unify platform’s goals and constraints