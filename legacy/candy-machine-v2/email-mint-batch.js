/**
 * Batch Email-to-Mint Script for Unify NFT Collection
 * 
 * Mint cNFTs to multiple email addresses at once.
 * 
 * Usage:
 *   node email-mint-batch.js <emails-file>
 * 
 * Email file format (one email per line):
 *   user1@example.com
 *   user2@example.com
 *   user3@example.com
 */

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey, some, none } = require('@metaplex-foundation/umi');
const { mintToCollectionV1, mplBubblegum, TokenStandard } = require('@metaplex-foundation/mpl-bubblegum');
const { mplTokenMetadata, findMetadataPda, findMasterEditionPda } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CROSSMINT_CONFIG = {
  staging: {
    apiKey: 'sk_staging_AAJ2cjQHFU28SbLrRaZ9eRMtrGmHD7bEphWpgW8QcEKnsinTFEqGzyMeNM86GMz1XnF5Yc873yyNuANqvoag7BrWEC6MeJDojVQWsQXaPTN8F6nTNGkmSuknVNAqHvWb5cxDp9c1G4XxrvoHr93hy49TC7iiaoWHrBKrSB6Gmr9eZyz5wuvo2V858KYDWakPbrLUFXudW8brsPpDyP1iitkM',
    baseUrl: 'https://staging.crossmint.com/api/v1-alpha2'
  },
  production: {
    apiKey: 'sk_production_5diLC7QVbiDqHAYvAHEaa4ciJpyZ8TKhR1E3jgt9fk6BCR4HBF8hPcHTAPTaXC6yRDvJJLMXSwpLaynihMP2xMUi2psH4iV1TZsMuVXb9MoPst8EuxfouWTw6udLPCya1ESBqiiDN1N6e1GSjzoC5ZtNb7QyNqkNmdrG3Li9TXK39YKThQJF9HBgxkwvaLNEFog9aaEgsGKjTpGFk5vES4M3',
    baseUrl: 'https://www.crossmint.com/api/v1-alpha2'
  }
};

const CROSSMINT_ENV = 'production'; // Using production for mainnet
const crossmint = CROSSMINT_CONFIG[CROSSMINT_ENV];

const METADATA_FOLDER_CID = 'bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce';
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b';

// Delay between mints (ms) to avoid rate limiting
const MINT_DELAY = 2000;

// =============================================================================
// SETUP UMI
// =============================================================================

const umi = createUmi(RPC_URL)
  .use(mplTokenMetadata())
  .use(mplBubblegum());

const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWalletForEmail(email) {
  try {
    const response = await fetch(`${crossmint.baseUrl}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': crossmint.apiKey
      },
      body: JSON.stringify({
        type: 'solana-custodial-wallet',
        linkedUser: `email:${email}`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Crossmint API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    throw error;
  }
}

async function mintUnifyNFT(recipientAddress, nftIndex) {
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree-v2.json', 'utf8'));
  
  const collectionMint = publicKey(treeInfo.collectionMint);
  const metadataUri = `https://gateway.pinata.cloud/ipfs/${METADATA_FOLDER_CID}/${nftIndex}.json`;

  const metadata = {
    name: `Unify NFT #${nftIndex}`,
    symbol: 'UNIFY',
    uri: metadataUri,
    sellerFeeBasisPoints: 0,
    collection: {
      key: collectionMint,
      verified: false
    },
    creators: [
      {
        address: umiKeypair.publicKey,
        verified: false,
        share: 100
      }
    ],
    primarySaleHappened: false,
    isMutable: true,
    editionNonce: none(),
    tokenStandard: some(TokenStandard.NonFungible),
    uses: none(),
    tokenProgramVersion: 0
  };

  const tx = await mintToCollectionV1(umi, {
    leafOwner: publicKey(recipientAddress),
    merkleTree: publicKey(treeInfo.merkleTree),
    collectionMint: collectionMint,
    metadata: metadata,
  }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

  return Buffer.from(tx.signature).toString('base64');
}

// =============================================================================
// BATCH MINT
// =============================================================================

async function batchEmailMint(emailsFile) {
  console.log('='.repeat(60));
  console.log('BATCH EMAIL-TO-MINT: UNIFY NFT COLLECTION');
  console.log('='.repeat(60));

  // Validate config
  if (crossmint.apiKey.includes('YOUR_')) {
    console.error('\n❌ ERROR: Set your Crossmint API key first!');
    process.exit(1);
  }

  if (METADATA_FOLDER_CID.includes('YOUR_')) {
    console.error('\n❌ ERROR: Set your METADATA_FOLDER_CID first!');
    process.exit(1);
  }

  // Load emails
  if (!fs.existsSync(emailsFile)) {
    console.error(`\n❌ File not found: ${emailsFile}`);
    process.exit(1);
  }

  const emails = fs.readFileSync(emailsFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('@'));

  console.log(`\nEnvironment: ${CROSSMINT_ENV.toUpperCase()}`);
  console.log(`Minting authority: ${umiKeypair.publicKey}`);
  console.log(`Emails to process: ${emails.length}\n`);

  const results = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const progress = `[${i + 1}/${emails.length}]`;

    try {
      console.log(`${progress} Processing ${email}...`);
      
      // Get wallet for email
      const walletAddress = await getWalletForEmail(email);
      console.log(`   → Wallet: ${walletAddress.substring(0, 20)}...`);

      // Mint NFT
      const signature = await mintUnifyNFT(walletAddress, i);
      console.log(`   ✅ Minted NFT #${i}`);

      results.push({
        email,
        wallet: walletAddress,
        nftIndex: i,
        status: 'success',
        signature
      });
      successful++;

      // Delay between mints
      if (i < emails.length - 1) {
        await sleep(MINT_DELAY);
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({
        email,
        nftIndex: i,
        status: 'failed',
        error: error.message
      });
      failed++;
    }
  }

  // Save results
  const resultsFile = `email-mint-results-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('BATCH COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📄 Results saved to: ${resultsFile}`);

  return results;
}

// =============================================================================
// CLI
// =============================================================================

const emailsFile = process.argv[2];

if (!emailsFile) {
  console.log(`
Usage: node email-mint-batch.js <emails-file>

Example:
  node email-mint-batch.js emails.txt

emails.txt format (one email per line):
  user1@example.com
  user2@example.com
  user3@example.com
`);
  process.exit(1);
}

batchEmailMint(emailsFile);
