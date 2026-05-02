const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey, some, none } = require('@metaplex-foundation/umi');
const { mintToCollectionV1, mplBubblegum, TokenStandard } = require('@metaplex-foundation/mpl-bubblegum');
const { mplTokenMetadata, findMetadataPda, findMasterEditionPda } = require('@metaplex-foundation/mpl-token-metadata');
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
  console.error('Usage: node cnft-mint-to-collection.js <addresses-file> <metadata-folder-cid>');
  console.error('\nExample:');
  console.error('node cnft-mint-to-collection.js addresses.txt bafybeiascws7hnrbos6f7nimovkhpmyyocpw26aof4tld2sjf6mj3qlwti');
  process.exit(1);
}

async function mintToCollection() {
  console.log('='.repeat(60));
  console.log('MINTING CNFTS TO VERIFIED COLLECTION');
  console.log('='.repeat(60));

  // Load tree info (using clean v2 tree)
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree-v2.json', 'utf8'));
  
  // Load addresses
  let addresses = [];
  if (fs.existsSync(addressFile)) {
    const content = fs.readFileSync(addressFile, 'utf8');
    addresses = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 30);
  } else {
    console.error(`File not found: ${addressFile}`);
    process.exit(1);
  }

  const collectionMint = publicKey(treeInfo.collectionMint);
  
  // Derive collection metadata and edition PDAs
  const collectionMetadata = findMetadataPda(umi, { mint: collectionMint });
  const collectionEdition = findMasterEditionPda(umi, { mint: collectionMint });

  console.log(`\nMerkle Tree: ${treeInfo.merkleTree}`);
  console.log(`Collection Mint: ${treeInfo.collectionMint}`);
  console.log(`Collection Metadata: ${collectionMetadata[0]}`);
  console.log(`Collection Edition: ${collectionEdition[0]}`);
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

      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataFolderCID}/${i}.json`;
      
      // MetadataArgs for mintToCollectionV1
      const metadata = {
        name: `Unify NFT #${i}`,
        symbol: 'UNIFY',
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        collection: {
          key: collectionMint,
          verified: false  // Will be verified by the instruction
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
        tokenProgramVersion: 0  // 0 = Original
      };

      const tx = await mintToCollectionV1(umi, {
        leafOwner: publicKey(recipient),
        merkleTree: publicKey(treeInfo.merkleTree),
        collectionMint: collectionMint,
        collectionMetadata: collectionMetadata,
        collectionEdition: collectionEdition,
        collectionAuthority: umiKeypair,
        metadata: metadata
      });

      await tx.sendAndConfirm(umi);

      console.log(`  ✅ Success (with verified collection)`);
      console.log(`  Metadata: ${metadataUri}`);
      successful++;
      results.push({ recipient, status: 'success', index: i, metadataUri, verified: true });

      // Delay to avoid rate limiting
      if (i < addresses.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }

    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.substring(0, 80)}`);
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
  fs.writeFileSync('./batch-mint-results-verified.json', JSON.stringify(results, null, 2));
  console.log('Results saved to batch-mint-results-verified.json');
  console.log('\n✅ cNFTs minted with VERIFIED COLLECTION!');
  console.log('   These should now appear in Phantom Collectibles within 10-15 minutes.\n');
}

mintToCollection().catch(console.error);
