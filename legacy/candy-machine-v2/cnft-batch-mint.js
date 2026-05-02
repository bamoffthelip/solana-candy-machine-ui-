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
const imageCID = process.argv[3] || 'bafybeig5l5s3eyaf7ddbuqkbijgzqouy7d6daex4h66anayv2tz7etcvte';

if (!addressFile) {
  console.error('Usage: node cnft-batch-mint.js <addresses-file> [image-cid]');
  console.error('\nExample addresses file (addresses.txt):');
  console.error('2yisnFF7oppGpoKzEUdea9mbL8brbjjNdt2dYmuEjULP');
  console.error('A2CWFF2jNig2SEJQCDmVVAQKnWj6DdsRPAgdYDjx29FA');
  console.error('73ATS1gRpUyjeKC9gNTevVgHFmivp9C4ERVApdzDqsZB');
  process.exit(1);
}

async function batchMintCompressedNFTs() {
  console.log('='.repeat(60));
  console.log('BATCH MINTING COMPRESSED NFTS');
  console.log('='.repeat(60));

  // Load tree info
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree.json', 'utf8'));
  
  // Load addresses
  let addresses = [];
  if (fs.existsSync(addressFile)) {
    const content = fs.readFileSync(addressFile, 'utf8');
    addresses = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } else {
    console.error(`File not found: ${addressFile}`);
    process.exit(1);
  }

  console.log(`\nMerkle Tree: ${treeInfo.merkleTree}`);
  console.log(`Collection: ${treeInfo.collectionMint}`);
  console.log(`Image: https://gateway.pinata.cloud/ipfs/${imageCID}`);
  console.log(`Addresses to mint: ${addresses.length}\n`);

  const results = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < addresses.length; i++) {
    const recipient = addresses[i];
    const progress = `[${i + 1}/${addresses.length}]`;

    try {
      console.log(`${progress} Minting to ${recipient.substring(0, 20)}...`);

      const metadata = {
        name: 'Unify Promo NFT',
        symbol: 'UNIFY',
        uri: `https://gateway.pinata.cloud/ipfs/${imageCID}`,
        sellerFeeBasisPoints: 0,
        collection: {
          key: publicKey(treeInfo.collectionMint),
          verified: false
        },
        creators: [
          {
            address: umiKeypair.publicKey,
            verified: true,
            share: 100
          }
        ]
      };

      const tx = await mintV1(umi, {
        leafOwner: publicKey(recipient),
        merkleTree: publicKey(treeInfo.merkleTree),
        metadata: metadata
      });

      await tx.sendAndConfirm(umi);

      console.log(`  ✅ Success`);
      successful++;
      results.push({ recipient, status: 'success' });

      // Small delay to avoid rate limiting
      if (i < addresses.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.substring(0, 50)}`);
      failed++;
      results.push({ recipient, status: 'failed', error: error.message });
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
  fs.writeFileSync('./batch-mint-results.json', JSON.stringify(results, null, 2));
  console.log('Results saved to batch-mint-results.json\n');
}

batchMintCompressedNFTs().catch(console.error);
