const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, percentAmount } = require('@metaplex-foundation/umi');
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

async function setupCleanCollection() {
  console.log('='.repeat(60));
  console.log('CREATING CLEAN COLLECTION NFT (V2)');
  console.log('='.repeat(60));
  console.log('\nRemoving all spam-trigger words from collection...\n');

  const collectionMint = generateSigner(umi);
  
  try {
    await createNft(umi, {
      mint: collectionMint,
      name: 'Unify Collection',
      symbol: 'UNIFY',
      uri: 'https://gateway.pinata.cloud/ipfs/bafybeihzks2stpbjqoi3xofd7ueh5ubw4auydycabmijjhav7qducmawsi/0.json',
      sellerFeeBasisPoints: percentAmount(0),
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

    const collectionInfo = {
      collectionMint: collectionMint.publicKey,
      authority: umiKeypair.publicKey,
      created: new Date().toISOString()
    };

    fs.writeFileSync('./cnft-collection-v2.json', JSON.stringify(collectionInfo, null, 2));
    console.log('Saved collection info to cnft-collection-v2.json\n');

    return collectionMint.publicKey;

  } catch (error) {
    console.error('Failed to create collection:', error.message);
    process.exit(1);
  }
}

setupCleanCollection().catch(console.error);
