const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, transactionBuilder } = require('@metaplex-foundation/umi');
const { createTree, mplBubblegum } = require('@metaplex-foundation/mpl-bubblegum');
const { mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// Setup UMI with Bubblegum
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata())
  .use(mplBubblegum());

// Load wallet
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

async function createMerkleTree() {
  console.log('='.repeat(60));
  console.log('CREATING MERKLE TREE FOR COMPRESSED NFTS');
  console.log('='.repeat(60));

  // Load collection info
  const collectionInfo = JSON.parse(fs.readFileSync('./cnft-collection.json', 'utf8'));
  console.log(`\nCollection: ${collectionInfo.collectionMint}`);

  // Generate tree keypair
  const merkleTree = generateSigner(umi);
  
  console.log('\nTree Configuration:');
  console.log('  Max Depth: 14 (up to 16,384 leaves)');
  console.log('  Max Buffer Size: 64');
  console.log('  Canopy Depth: 0 (no caching, cheapest)');
  console.log(`\nCreating tree at: ${merkleTree.publicKey}\n`);

  try {
    const tx = await createTree(umi, {
      merkleTree,
      maxDepth: 14,
      maxBufferSize: 64,
      public: false // Tree is private to you
    });
    
    await tx.sendAndConfirm(umi);

    console.log('✅ Merkle tree created!\n');

    // Save tree info
    const treeInfo = {
      ...collectionInfo,
      merkleTree: merkleTree.publicKey,
      maxDepth: 14,
      maxBufferSize: 64,
      capacity: 16384,
      treeCreated: new Date().toISOString()
    };

    fs.writeFileSync('./cnft-tree.json', JSON.stringify(treeInfo, null, 2));
    console.log('Saved tree info to cnft-tree.json');

    console.log('\n' + '='.repeat(60));
    console.log('TREE READY FOR MINTING');
    console.log('='.repeat(60));
    console.log(`\nMerkle Tree: ${merkleTree.publicKey}`);
    console.log(`Collection: ${collectionInfo.collectionMint}`);
    console.log(`Capacity: 16,384 cNFTs`);
    console.log(`\nSolscan: https://solscan.io/account/${merkleTree.publicKey}\n`);
    console.log('Next: node cnft-mint.js <recipient-address>\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

createMerkleTree().catch(console.error);
