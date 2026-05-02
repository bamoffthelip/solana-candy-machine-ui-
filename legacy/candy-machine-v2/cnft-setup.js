const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, percentAmount, createSignerFromKeypair } = require('@metaplex-foundation/umi');
const { createTree } = require('@metaplex-foundation/mpl-bubblegum');
const { createNft, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Load wallet
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

async function setupCNFTCollection() {
  console.log('='.repeat(60));
  console.log('COMPRESSED NFT COLLECTION SETUP');
  console.log('='.repeat(60));
  console.log('\nStep 1: Creating Collection NFT (uncompressed)...\n');

  // Create collection NFT (this is uncompressed and anchors the cNFT tree)
  const collectionMint = generateSigner(umi);
  
  try {
    await createNft(umi, {
      mint: collectionMint,
      name: 'Unify Promo Collection',
      symbol: 'UNIFY',
      uri: 'https://gateway.pinata.cloud/ipfs/bafybeihzks2stpbjqoi3xofd7ueh5ubw4auydycabmijjhav7qducmawsi/0.json',
      sellerFeeBasisPoints: percentAmount(0), // No royalties for promo
      isCollection: true,
      creators: [{
        address: umiKeypair.publicKey,
        verified: true,
        share: 100
      }]
    }).sendAndConfirm(umi);

    console.log('✅ Collection NFT created!');
    console.log(`   Collection Mint: ${collectionMint.publicKey}`);
    console.log(`   Solscan: https://solscan.io/token/${collectionMint.publicKey}\n`);

    // Save collection info
    const collectionInfo = {
      collectionMint: collectionMint.publicKey,
      authority: umiKeypair.publicKey,
      created: new Date().toISOString()
    };

    fs.writeFileSync('./cnft-collection.json', JSON.stringify(collectionInfo, null, 2));
    console.log('Saved collection info to cnft-collection.json\n');

    console.log('Step 2: Creating Merkle Tree for compressed NFTs...\n');
    console.log('Tree specs for ~14 NFTs:');
    console.log('  Max depth: 14 (supports up to 16,384 NFTs)');
    console.log('  Max buffer: 64');
    console.log('  Estimated tree cost: ~0.06-0.08 SOL one-time\n');

    return collectionInfo;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

setupCNFTCollection()
  .then((info) => {
    console.log('='.repeat(60));
    console.log('SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Run: node cnft-create-tree.js (creates the merkle tree)');
    console.log('2. Run: node cnft-mint.js <recipient-address> (mints cNFTs)\n');
    console.log('Collection will be verified on all minted cNFTs.');
    console.log('Cost per mint: <0.0001 SOL (~$0.01 at $100/SOL)\n');
  })
  .catch(console.error);
