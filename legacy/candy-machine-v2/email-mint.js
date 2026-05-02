/**
 * Email-to-Mint Script for Unify NFT Collection
 * 
 * This script mints cNFTs to users via email address using:
 * - Crossmint API: Creates/retrieves custodial wallet for email
 * - Your Authority: YOU mint the NFT (not Crossmint)
 * 
 * Benefits:
 * - Users don't need a crypto wallet
 * - Your minting address (not Crossmint's potentially flagged address)
 * - Your verified collection (Unify, not Epstain)
 * 
 * Usage:
 *   node email-mint.js <email> [nft-index]
 * 
 * Example:
 *   node email-mint.js user@example.com 0
 */

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey, some, none } = require('@metaplex-foundation/umi');
const { mintToCollectionV1, mplBubblegum, TokenStandard } = require('@metaplex-foundation/mpl-bubblegum');
const { mplTokenMetadata, findMetadataPda, findMasterEditionPda } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// =============================================================================
// CONFIGURATION
// =============================================================================

// Crossmint API Configuration
// Get your API key from: https://www.crossmint.com/console/projects/apiKeys
// Use staging key for testing, production key for mainnet
const CROSSMINT_CONFIG = {
  // STAGING (for testing) - uses devnet
  staging: {
    apiKey: 'sk_staging_AAJ2cjQHFU28SbLrRaZ9eRMtrGmHD7bEphWpgW8QcEKnsinTFEqGzyMeNM86GMz1XnF5Yc873yyNuANqvoag7BrWEC6MeJDojVQWsQXaPTN8F6nTNGkmSuknVNAqHvWb5cxDp9c1G4XxrvoHr93hy49TC7iiaoWHrBKrSB6Gmr9eZyz5wuvo2V858KYDWakPbrLUFXudW8brsPpDyP1iitkM',
    baseUrl: 'https://staging.crossmint.com/api/v1-alpha2'
  },
  // PRODUCTION (for mainnet)
  production: {
    apiKey: 'sk_production_5diLC7QVbiDqHAYvAHEaa4ciJpyZ8TKhR1E3jgt9fk6BCR4HBF8hPcHTAPTaXC6yRDvJJLMXSwpLaynihMP2xMUi2psH4iV1TZsMuVXb9MoPst8EuxfouWTw6udLPCya1ESBqiiDN1N6e1GSjzoC5ZtNb7QyNqkNmdrG3Li9TXK39YKThQJF9HBgxkwvaLNEFog9aaEgsGKjTpGFk5vES4M3',
    baseUrl: 'https://www.crossmint.com/api/v1-alpha2'
  }
};

// Set which environment to use
const CROSSMINT_ENV = 'production'; // Using production for mainnet
const crossmint = CROSSMINT_CONFIG[CROSSMINT_ENV];

// Your metadata folder CID on IPFS (where 0.json, 1.json, etc. are stored)
const METADATA_FOLDER_CID = 'bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce';
// Example: 'bafybeiascws7hnrbos6f7nimovkhpmyyocpw26aof4tld2sjf6mj3qlwti'

// Helius RPC (your existing one)
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b';

// =============================================================================
// SETUP UMI
// =============================================================================

const umi = createUmi(RPC_URL)
  .use(mplTokenMetadata())
  .use(mplBubblegum());

// Load your wallet (minting authority)
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

// =============================================================================
// CROSSMINT WALLET FUNCTIONS
// =============================================================================

/**
 * Get or create a Crossmint custodial wallet for an email address
 * @param {string} email - User's email address
 * @returns {Promise<string>} - Solana wallet address
 */
async function getWalletForEmail(email) {
  console.log(`\n📧 Looking up/creating wallet for: ${email}`);
  
  try {
    // Create a wallet for the email (or get existing one)
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
    // API returns 'address' in production, 'publicKey' in staging
    const walletAddress = data.address || data.publicKey;
    console.log(`✅ Wallet address: ${walletAddress}`);
    
    return walletAddress;
  } catch (error) {
    console.error('❌ Failed to get wallet:', error.message);
    throw error;
  }
}

// =============================================================================
// MINT FUNCTION
// =============================================================================

/**
 * Mint a Unify cNFT to a wallet address
 * @param {string} recipientAddress - Solana wallet address to mint to
 * @param {number} nftIndex - Which NFT to mint (0, 1, 2, etc.)
 */
async function mintUnifyNFT(recipientAddress, nftIndex = 0) {
  console.log(`\n🎨 Minting Unify NFT #${nftIndex} to ${recipientAddress}`);

  // Load tree info
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree-v2.json', 'utf8'));
  
  const collectionMint = publicKey(treeInfo.collectionMint);
  const collectionMetadata = findMetadataPda(umi, { mint: collectionMint });
  const collectionEdition = findMasterEditionPda(umi, { mint: collectionMint });

  // Metadata URI pointing to IPFS JSON
  const metadataUri = `https://gateway.pinata.cloud/ipfs/${METADATA_FOLDER_CID}/${nftIndex}.json`;
  
  console.log(`   Collection: ${treeInfo.collectionMint}`);
  console.log(`   Merkle Tree: ${treeInfo.merkleTree}`);
  console.log(`   Metadata URI: ${metadataUri}`);

  // Build metadata for the cNFT
  const metadata = {
    name: `Unify NFT #${nftIndex}`,
    symbol: 'UNIFY',
    uri: metadataUri,
    sellerFeeBasisPoints: 0,
    collection: {
      key: collectionMint,
      verified: false // Will be verified by mintToCollectionV1
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

  try {
    // Mint using YOUR authority
    const tx = await mintToCollectionV1(umi, {
      leafOwner: publicKey(recipientAddress),
      merkleTree: publicKey(treeInfo.merkleTree),
      collectionMint: collectionMint,
      metadata: metadata,
    }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

    const signature = Buffer.from(tx.signature).toString('base64');
    console.log(`\n✅ SUCCESS! NFT minted`);
    console.log(`   Signature: ${signature}`);
    
    return {
      success: true,
      recipient: recipientAddress,
      nftIndex,
      signature
    };
  } catch (error) {
    console.error(`\n❌ Minting failed:`, error.message);
    return {
      success: false,
      recipient: recipientAddress,
      nftIndex,
      error: error.message
    };
  }
}

// =============================================================================
// MAIN: EMAIL TO MINT
// =============================================================================

async function emailMint(email, nftIndex = 0) {
  console.log('='.repeat(60));
  console.log('EMAIL-TO-MINT: UNIFY NFT COLLECTION');
  console.log('='.repeat(60));
  console.log(`\nEnvironment: ${CROSSMINT_ENV.toUpperCase()}`);
  console.log(`Your minting authority: ${umiKeypair.publicKey}`);

  // Validate configuration
  if (crossmint.apiKey.includes('YOUR_')) {
    console.error('\n❌ ERROR: Please set your Crossmint API key in the script!');
    console.error('   Get one at: https://www.crossmint.com/console/projects/apiKeys');
    process.exit(1);
  }

  if (METADATA_FOLDER_CID.includes('YOUR_')) {
    console.error('\n❌ ERROR: Please set your METADATA_FOLDER_CID in the script!');
    console.error('   This should be the IPFS CID of your metadata folder.');
    process.exit(1);
  }

  try {
    // Step 1: Get/create wallet for email
    const walletAddress = await getWalletForEmail(email);
    
    // Step 2: Mint NFT to that wallet (using YOUR authority)
    const result = await mintUnifyNFT(walletAddress, nftIndex);
    
    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 MINTING COMPLETE!');
      console.log('='.repeat(60));
      console.log(`\n   Email: ${email}`);
      console.log(`   Wallet: ${walletAddress}`);
      console.log(`   NFT: Unify NFT #${nftIndex}`);
      console.log(`\nThe user will receive an email from Crossmint to claim their wallet.`);
      console.log('The NFT is already in their wallet and viewable on:');
      console.log(`   https://xray.helius.xyz/account/${walletAddress}`);
    }
    
    return result;
  } catch (error) {
    console.error('\n❌ Email mint failed:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

const email = process.argv[2];
const nftIndex = parseInt(process.argv[3]) || 0;

if (!email) {
  console.log(`
Usage: node email-mint.js <email> [nft-index]

Examples:
  node email-mint.js user@example.com        # Mints NFT #0
  node email-mint.js user@example.com 5      # Mints NFT #5

Before running:
1. Set your Crossmint API key in CROSSMINT_CONFIG
2. Set your METADATA_FOLDER_CID
3. Make sure cnft-tree-v2.json exists with your tree info
`);
  process.exit(1);
}

// Validate email format
if (!email.includes('@')) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

emailMint(email, nftIndex);
