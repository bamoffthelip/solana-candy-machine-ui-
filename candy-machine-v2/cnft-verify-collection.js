const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { verifyCollection, mplBubblegum } = require('@metaplex-foundation/mpl-bubblegum');
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

const resultsFile = process.argv[2] || './batch-mint-results-v3.json';

async function verifyCollectionOnCNFTs() {
  console.log('='.repeat(60));
  console.log('VERIFYING COLLECTION ON COMPRESSED NFTS');
  console.log('='.repeat(60));

  if (!fs.existsSync(resultsFile)) {
    console.error(`\nResults file not found: ${resultsFile}`);
    console.error('Usage: node cnft-verify-collection.js [results-file]\n');
    process.exit(1);
  }

  // Load tree info and mint results
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree.json', 'utf8'));
  const mintResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  
  const successfulMints = mintResults.filter(r => r.status === 'success');
  
  console.log(`\nMerkle Tree: ${treeInfo.merkleTree}`);
  console.log(`Collection: ${treeInfo.collectionMint}`);
  console.log(`cNFTs to verify: ${successfulMints.length}\n`);

  let verified = 0;
  let failed = 0;

  for (let i = 0; i < successfulMints.length; i++) {
    const result = successfulMints[i];
    const progress = `[${i + 1}/${successfulMints.length}]`;

    try {
      console.log(`${progress} Verifying cNFT at index ${result.index}...`);

      const tx = await verifyCollection(umi, {
        leafOwner: publicKey(result.recipient),
        collectionMint: publicKey(treeInfo.collectionMint),
        collectionAuthority: umiKeypair,
        merkleTree: publicKey(treeInfo.merkleTree),
        leaf: {
          // We need the leaf data for verification
          // Since we don't have it stored, we'll need to fetch it
          id: publicKey(treeInfo.merkleTree),
          index: result.index
        }
      });

      await tx.sendAndConfirm(umi);

      console.log(`  ✅ Verified`);
      verified++;

      // Small delay to avoid rate limiting
      if (i < successfulMints.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }

    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.substring(0, 60)}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${successfulMints.length}`);
  console.log(`Verified: ${verified}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total cost: approximately ${(verified * 0.00005).toFixed(6)} SOL\n`);
  
  console.log('After verification, wait 5-10 minutes for indexing.');
  console.log('cNFTs should then display properly in Phantom and explorers.\n');
}

verifyCollectionOnCNFTs().catch(console.error);
