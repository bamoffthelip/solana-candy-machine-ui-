const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { mintV1, mplBubblegum } = require('@metaplex-foundation/mpl-bubblegum');
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

const addressFile = process.argv[2];
const metadataFolderCID = process.argv[3];

if (!addressFile || !metadataFolderCID) {
  console.error('Usage: node cnft-batch-mint-v3.js <addresses-file> <metadata-folder-cid>');
  console.error('\nExample:');
  console.error('node cnft-batch-mint-v3.js addresses.txt bafybeihzks2stpbjqoi3xofd7ueh5ubw4auydycabmijjhav7qducmawsi');
  process.exit(1);
}

async function batchMintCompressedNFTs() {
  console.log('='.repeat(60));
  console.log('BATCH MINTING COMPRESSED NFTS (V3 - PROPER METADATA)');
  console.log('='.repeat(60));

  // Load tree info
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree.json', 'utf8'));
  
  // Load addresses
  let addresses = [];
  if (fs.existsSync(addressFile)) {
    const content = fs.readFileSync(addressFile, 'utf8');
    addresses = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length > 30); // Filter out corrupted/short addresses
  } else {
    console.error(`File not found: ${addressFile}`);
    process.exit(1);
  }

  console.log(`\nMerkle Tree: ${treeInfo.merkleTree}`);
  console.log(`Collection: ${treeInfo.collectionMint}`);
  console.log(`Metadata Folder: https://gateway.pinata.cloud/ipfs/${metadataFolderCID}`);
  console.log(`Addresses to mint: ${addresses.length}\n`);

  const results = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < addresses.length; i++) {
    const recipient = addresses[i];
    const progress = `[${i + 1}/${addresses.length}]`;

    try {
      console.log(`${progress} Minting to ${recipient.substring(0, 20)}...`);

      // Proper metadata with JSON URI
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataFolderCID}/${i}.json`;
      
      const metadata = {
        name: `Unify NFT #${i}`,
        symbol: 'UNIFY',
        uri: metadataUri, // Points to JSON file, not image
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: umiKeypair.publicKey,
            verified: true,
            share: 100
          }
        ],
        collection: {
          key: publicKey(treeInfo.collectionMint),
          verified: false
        }
      };

      const tx = await mintV1(umi, {
        leafOwner: publicKey(recipient),
        merkleTree: publicKey(treeInfo.merkleTree),
        metadata: metadata
      });

      await tx.sendAndConfirm(umi);

      console.log(`  ✅ Success`);
      console.log(`  Metadata: ${metadataUri}`);
      successful++;
      results.push({ recipient, status: 'success', index: i, metadataUri });

      // Delay to avoid rate limiting
      if (i < addresses.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }

    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.substring(0, 50)}`);
      failed++;
      results.push({ recipient, status: 'failed', error: error.message, index: i });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('BATCH MINT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${addresses.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total cost: approximately ${(successful * 0.00005).toFixed(6)} SOL\n`);

  if (failed > 0) {
    console.log('Failed addresses:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`  ${r.recipient}: ${r.error.substring(0, 60)}`);
    });
    console.log();
  }

  // Save results
  fs.writeFileSync('./batch-mint-results-v3.json', JSON.stringify(results, null, 2));
  console.log('Results saved to batch-mint-results-v3.json');
  console.log('\nNFTs should appear in Phantom Collectibles within 10-15 minutes');
  console.log('Images should display on Solscan/Orb immediately\n');
}

batchMintCompressedNFTs().catch(console.error);
