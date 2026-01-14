const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner } = require('@metaplex-foundation/umi');
const { createTree, mplBubblegum } = require('@metaplex-foundation/mpl-bubblegum');
const fs = require('fs');

// Setup UMI with Bubblegum
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplBubblegum());

// Load wallet
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

async function createCleanTree() {
  console.log('='.repeat(60));
  console.log('CREATING MERKLE TREE FOR CLEAN COLLECTION (V2)');
  console.log('='.repeat(60));

  // Load collection info
  const collectionInfo = JSON.parse(fs.readFileSync('./cnft-collection-v2.json', 'utf8'));
  
  console.log(`\nCollection: ${collectionInfo.collectionMint}`);
  console.log('\nTree specifications:');
  console.log('  Max depth: 14 (supports 16,384 NFTs)');
  console.log('  Max buffer: 64');
  console.log('  Estimated cost: ~0.22 SOL\n');
  console.log('Creating tree...\n');

  try {
    const treeKeypair = generateSigner(umi);

    const tx = await createTree(umi, {
      merkleTree: treeKeypair,
      maxDepth: 14,
      maxBufferSize: 64,
      public: false
    });

    await tx.sendAndConfirm(umi);

    console.log('✅ Merkle tree created!');
    console.log(`   Tree: ${treeKeypair.publicKey}`);
    console.log(`   Solscan: https://solscan.io/account/${treeKeypair.publicKey}\n`);

    const treeInfo = {
      collectionMint: collectionInfo.collectionMint,
      authority: umiKeypair.publicKey,
      merkleTree: treeKeypair.publicKey,
      maxDepth: 14,
      maxBufferSize: 64,
      capacity: 16384,
      created: new Date().toISOString(),
      treeCreated: new Date().toISOString()
    };

    fs.writeFileSync('./cnft-tree-v2.json', JSON.stringify(treeInfo, null, 2));
    console.log('Saved tree info to cnft-tree-v2.json\n');
    console.log('='.repeat(60));
    console.log('NEXT STEP');
    console.log('='.repeat(60));
    console.log(`\nMint cNFTs: node cnft-batch-mint-v3-clean.js addresses.txt <METADATA_FOLDER_CID>\n`);

  } catch (error) {
    console.error('Failed to create tree:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createCleanTree().catch(console.error);
