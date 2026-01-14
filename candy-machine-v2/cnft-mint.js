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

const recipientAddress = process.argv[2];
const imageCID = process.argv[3] || 'bafybeig5l5s3eyaf7ddbuqkbijgzqouy7d6daex4h66anayv2tz7etcvte'; // Sigma Chi logo default

if (!recipientAddress) {
  console.error('Usage: node cnft-mint.js <recipient-address> [image-cid]');
  console.error('Example: node cnft-mint.js 2yisnFF7oppGpoKzEUdea9mbL8brbjjNdt2dYmuEjULP');
  process.exit(1);
}

async function mintCompressedNFT() {
  console.log('='.repeat(60));
  console.log('MINTING COMPRESSED NFT');
  console.log('='.repeat(60));

  // Load tree info
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree.json', 'utf8'));
  
  console.log(`\nMerkle Tree: ${treeInfo.merkleTree}`);
  console.log(`Collection: ${treeInfo.collectionMint}`);
  console.log(`Recipient: ${recipientAddress}`);
  console.log(`Image: https://gateway.pinata.cloud/ipfs/${imageCID}\n`);

  // Create metadata
  const metadata = {
    name: 'Unify Promo NFT',
    symbol: 'UNIFY',
    uri: `https://gateway.pinata.cloud/ipfs/${imageCID}`, // Point directly to image for now
    sellerFeeBasisPoints: 0,
    collection: {
      key: publicKey(treeInfo.collectionMint),
      verified: false // Will be verified after mint
    },
    creators: [
      {
        address: umiKeypair.publicKey,
        verified: true,
        share: 100
      }
    ]
  };

  try {
    console.log('Minting...');
    
    const tx = await mintV1(umi, {
      leafOwner: publicKey(recipientAddress),
      merkleTree: publicKey(treeInfo.merkleTree),
      metadata: metadata
    });

    await tx.sendAndConfirm(umi);

    console.log('\n✅ Compressed NFT minted successfully!');
    console.log(`\nRecipient can view it in Phantom (may take a few minutes to index)`);
    console.log(`Tree: https://solscan.io/account/${treeInfo.merkleTree}`);
    console.log(`\nCost: ~0.00005 SOL (~$0.005 at $100/SOL)\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

mintCompressedNFT().catch(console.error);
