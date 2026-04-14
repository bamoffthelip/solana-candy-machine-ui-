/**
 * Candy Machine v3 mint (client) — account flow (what happens under the hood)
 *
 * You only pass a few handles; @metaplex-foundation/mpl-candy-machine resolves the rest:
 *
 * 1. candyMachine — on-chain Candy Machine account (config, items left, collection link, etc.).
 * 2. mintAuthority — must sign; proves the wallet may mint from this CM (matches CM authority).
 * 3. nftOwner — the wallet that will own the new NFT (mint + token account + metadata accounts
 *    are created/derived by the program for this owner).
 *
 * The SDK fetches the CM account, derives PDAs (program-specific addresses), and builds the
 * full instruction list: Token Metadata, SPL Token, associated token accounts, collection
 * accounts, and any Candy Guard accounts attached to the machine — you do not list those by hand.
 */

const fs = require('fs');
const bs58 = require('bs58');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { mintV2, mplCandyMachine } = require('@metaplex-foundation/mpl-candy-machine');

// --- config ---

const DEFAULT_KEYPAIR_PATH = `${process.env.HOME}/.config/solana/id.json`;
const ADDRESSES_FILE = 'addresses.txt';

/** Prefer HELIUS_API_KEY or SOLANA_RPC_URL; otherwise uses public mainnet (rate-limited). */
function rpcEndpoint() {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (heliusKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  }
  if (process.env.SOLANA_RPC_URL) {
    return process.env.SOLANA_RPC_URL;
  }
  console.warn(
    '[airdrop-sdk] Using public mainnet RPC (rate-limited). Set HELIUS_API_KEY or SOLANA_RPC_URL.'
  );
  return 'https://api.mainnet-beta.solana.com';
}

const CANDY_MACHINE_ID = publicKey(
  process.env.CANDY_MACHINE_ID || 'FvSGdhxr3S9VvRnt5uLghSEAuuN9iLtAT7S8s9paUUVD'
);

const MINT_GAP_MS = 2000;

// --- wallet + umi ---

function loadDefaultKeypair(umi) {
  const raw = fs.readFileSync(DEFAULT_KEYPAIR_PATH, 'utf8');
  const secretKey = Uint8Array.from(JSON.parse(raw));
  return umi.eddsa.createKeypairFromSecretKey(secretKey);
}

function createUmiWithPayer() {
  const umi = createUmi(rpcEndpoint()).use(mplCandyMachine());
  const payer = loadDefaultKeypair(umi);
  umi.use(keypairIdentity(payer));
  return { umi, payer };
}

function loadRecipientLines() {
  return fs
    .readFileSync(ADDRESSES_FILE, 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// --- mint ---

async function mintToAddress(umi, payer, recipient) {
  console.log(`Minting to ${recipient}...`);
  const tx = await mintV2(umi, {
    candyMachine: CANDY_MACHINE_ID,
    mintAuthority: payer,
    nftOwner: publicKey(recipient),
  }).sendAndConfirm(umi);

  console.log(`✅ Success! TX: ${bs58.encode(tx.signature)}`);
  return true;
}

async function main() {
  const { umi, payer } = createUmiWithPayer();
  const addresses = loadRecipientLines();

  console.log('Starting airdrop...');
  console.log(`Candy Machine: ${CANDY_MACHINE_ID}`);
  console.log(`Mint authority (signer): ${payer.publicKey}`);
  console.log(`${addresses.length} addresses to mint`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (const address of addresses) {
    try {
      const ok = await mintToAddress(umi, payer, address);
      if (ok) success++;
      else failed++;
    } catch (e) {
      console.log(`❌ Failed: ${e.message}`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, MINT_GAP_MS));
  }

  console.log('');
  console.log('='.repeat(40));
  console.log('Airdrop complete!');
  console.log(`Successful: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(40));
}

main().catch(console.error);
