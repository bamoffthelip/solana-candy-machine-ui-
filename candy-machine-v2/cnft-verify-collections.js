const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { verifyCollection, mplBubblegum, getAssetWithProof } = require('@metaplex-foundation/mpl-bubblegum');
const { mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { dasApi } = require('@metaplex-foundation/digital-asset-standard-api');
const fs = require('fs');

// Setup UMI with Bubblegum and DAS API
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata())
  .use(mplBubblegum())
  .use(dasApi());

// Load wallet
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

async function verifyCompressedNFTCollections() {
  console.log('='.repeat(60));
  console.log('VERIFYING COLLECTIONS ON COMPRESSED NFTS');
  console.log('='.repeat(60));

  // Load tree info
  const treeInfo = JSON.parse(fs.readFileSync('./cnft-tree.json', 'utf8'));
  
  console.log(`\nMerkle Tree: ${treeInfo.merkleTree}`);
  console.log(`Collection: ${treeInfo.collectionMint}\n`);
  console.log('Fetching unverified cNFTs from tree...\n');

  // Get the tree authority to search by
  const treeAuthority = umiKeypair.publicKey;

  // Search by creator (our wallet) to find our cNFTs
  const searchResponse = await fetch('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'search',
      method: 'searchAssets',
      params: {
        creatorAddress: treeAuthority,
        compressed: true,
        page: 1,
        limit: 100
      }
    })
  });

  const searchData = await searchResponse.json();
  
  if (!searchData.result || !searchData.result.items) {
    console.error('Failed to fetch compressed assets');
    console.error(JSON.stringify(searchData, null, 2));
    process.exit(1);
  }

  // Filter for assets from our specific tree
  const cnfts = searchData.result.items.filter(item => 
    item.compression && 
    item.compression.compressed && 
    item.compression.tree === treeInfo.merkleTree
  );
  
  console.log(`Found ${cnfts.length} cNFTs in our tree\n`);

  // Filter for unverified collection NFTs
  const unverified = cnfts.filter(nft => {
    const hasCollection = nft.grouping && nft.grouping.length > 0;
    if (!hasCollection) return true; // No collection at all
    const collection = nft.grouping.find(g => g.group_key === 'collection');
    return !collection || !collection.verified;
  });

  console.log(`cNFTs with unverified/missing collection: ${unverified.length}\n`);

  if (unverified.length === 0) {
    console.log('All cNFTs already have verified collections!');
    return;
  }

  let verified = 0;
  let failed = 0;

  for (let i = 0; i < unverified.length; i++) {
    const nft = unverified[i];
    const progress = `[${i + 1}/${unverified.length}]`;

    try {
      console.log(`${progress} Verifying: ${nft.content.metadata.name}`);
      console.log(`  Asset ID: ${nft.id.substring(0, 20)}...`);
      console.log(`  Owner: ${nft.ownership.owner.substring(0, 20)}...`);

      // Get the asset proof from Helius
      const proofResponse = await fetch('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-proof',
          method: 'getAssetProof',
          params: {
            id: nft.id
          }
        })
      });

      const proofData = await proofResponse.json();
      
      if (proofData.error || !proofData.result) {
        throw new Error(`Failed to get proof: ${JSON.stringify(proofData.error)}`);
      }

      const proof = proofData.result;

      // Verify collection using the proof
      const tx = await verifyCollection(umi, {
        leafOwner: publicKey(nft.ownership.owner),
        merkleTree: publicKey(nft.compression.tree),
        root: publicKey(proof.root),
        dataHash: publicKey(nft.compression.data_hash),
        creatorHash: publicKey(nft.compression.creator_hash),
        nonce: nft.compression.leaf_id,
        index: nft.compression.leaf_id,
        proof: proof.proof.map(p => ({ pubkey: publicKey(p), isWritable: false, isSigner: false })),
        collectionMint: publicKey(treeInfo.collectionMint),
        collectionAuthority: umiKeypair
      });

      await tx.sendAndConfirm(umi);

      console.log(`  ✅ Verified\n`);
      verified++;

      // Delay to avoid rate limiting
      if (i < unverified.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }

    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.substring(0, 60)}`);
      if (error.stack) {
        console.log(`  Stack: ${error.stack.substring(0, 150)}...`);
      }
      console.log();
      failed++;
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total unverified: ${unverified.length}`);
  console.log(`Successfully verified: ${verified}`);
  console.log(`Failed: ${failed}`);
  console.log(`Estimated cost: ${(verified * 0.00005).toFixed(6)} SOL\n`);
  
  if (verified > 0) {
    console.log('✅ Collection verification complete!');
    console.log('Wait 10-15 minutes for Helius to re-index.');
    console.log('cNFTs should then appear properly in Phantom and explorers.\n');
  }
}

verifyCompressedNFTCollections().catch(console.error);
