const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { updateV1, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const readline = require('readline');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Load keypair (update authority)
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const updateAuthority = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(updateAuthority));

// NFT mints and their indices
const nftData = [
  { index: 0, mint: 'EdRmMduVyAeUJ6e1RPsfyWCr4VYJDGMH4KZvXV3yssNV', name: 'Unify NFT #0' },
  { index: 1, mint: '2YygteSRPPFohxDaia9v3zWWvf9A2agjUqc5rK2r9GEq', name: 'Unify NFT #1' },
  { index: 2, mint: 'FtdTaubjQWM62sepuo2bNbqqfWHKj9cSzbNAvKU1a2oo', name: 'Unify NFT #2' },
  { index: 3, mint: 'DRPt2RAhEnZ6huYjVu6Dypc93BQ6UryyFLrjEWXSJorv', name: 'Unify NFT #3' },
  { index: 4, mint: '4B66YtiM8KvfJMybk7qbyYYkyys2TmpwbGj1V1TjnS19', name: 'Unify NFT #4' },
  { index: 5, mint: '4GrUvb67Sir6RfFDNpLGu8hW2MUv3o1RyoCrS8eYY6VS', name: 'Unify NFT #5' },
  { index: 6, mint: 'AkxaMMLWS4nTmRDcPyp3Wj5uFeoUvAi4ynfFjoJwYukw', name: 'Unify NFT #6' },
  { index: 7, mint: '8DN4fES2RTzwc1A4kFva1r92EWibDEEReEwjoYYsaRdA', name: 'Unify NFT #7' },
  { index: 8, mint: '45W5cCQRuZPVtmLmUq4rfmvs54aAGXwKuqi2x5mUTr3J', name: 'Unify NFT #8' },
  { index: 9, mint: 'EUkKoMEkg5ib2CqvdfmfwZ864xZkbUj4uzT21BscV2YG', name: 'Unify NFT #9' },
  { index: 10, mint: '75k5aRRvY9ffeymuw8DxzeaLNEyuMQm3bdfsyPCSJcXC', name: 'Unify NFT #10' },
  { index: 11, mint: 'Gf18cG5y7fPYbs1fxuxEQZ9jGgyqY5vTaXgfnT8kX3a7', name: 'Unify NFT #11' },
  { index: 12, mint: '8Exxe1YhCVUjsjcdigGXSDaeRBuXBdNrNFuRY6RJwLXX', name: 'Unify NFT #12' },
  { index: 13, mint: '4TBpPjrVWg9DVUQjVQ5XNKsqKZHzJYWdNiWqNU5KDu7B', name: 'Unify NFT #13' }
];

async function updateNFTMetadata(mintAddress, newMetadataUri, name) {
  try {
    console.log(`\nUpdating ${name}...`);
    console.log(`Mint: ${mintAddress}`);
    console.log(`New URI: ${newMetadataUri}`);
    
    const mint = publicKey(mintAddress);
    
    await updateV1(umi, {
      mint,
      authority: updateAuthority,
      data: {
        uri: newMetadataUri,
      },
    }).sendAndConfirm(umi);
    
    console.log('✅ Update successful!');
    return true;
  } catch (error) {
    console.log(`❌ Update failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('NFT Metadata Updater - Manual IPFS Upload Mode');
  console.log('='.repeat(60));
  console.log('\nThis script will update all 14 NFTs to point to new metadata URIs.\n');
  
  console.log('STEP 1: Upload your image to IPFS');
  console.log('----------------------------------------');
  console.log('Options:');
  console.log('  A) Pinata.cloud - Create free account, upload via web interface');
  console.log('  B) NFT.Storage - Free IPFS pinning for NFTs');
  console.log('  C) Filebase.com - Free S3-compatible IPFS storage\n');
  
  console.log('STEP 2: Create and upload metadata JSON');
  console.log('----------------------------------------');
  console.log('Create a JSON file like:');
  console.log(JSON.stringify({
    name: "Unify NFT #0",
    symbol: "UNIFY",
    description: "Unify NFT Collection - Exclusive member edition",
    image: "YOUR_IPFS_IMAGE_URL_HERE",
    attributes: [
      { trait_type: "Background", value: "Blue" },
      { trait_type: "Rarity", value: "Common" }
    ],
    properties: {
      files: [{ uri: "YOUR_IPFS_IMAGE_URL_HERE", type: "image/png" }],
      category: "image"
    }
  }, null, 2));
  console.log('\nUpload this JSON to IPFS and get its URL.\n');
  
  console.log('STEP 3: Provide the metadata URI');
  console.log('----------------------------------------');
  console.log('Format: ipfs://YOUR_CID or https://gateway.pinata.cloud/ipfs/YOUR_CID\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('Enter new metadata URI (or "skip" to exit):');
  
  rl.question('> ', async (metadataUri) => {
    rl.close();
    
    if (metadataUri.toLowerCase() === 'skip') {
      console.log('\nExiting. Run this script again when you have uploaded to IPFS.');
      return;
    }
    
    if (!metadataUri.startsWith('ipfs://') && !metadataUri.startsWith('https://')) {
      console.log('\n❌ Invalid URI format. Must start with ipfs:// or https://');
      return;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('Starting updates...');
    console.log(`${'='.repeat(60)}`);
    
    let success = 0;
    let failed = 0;
    
    for (const nft of nftData) {
      // Customize metadata URI for each NFT (e.g., different CID for each)
      // For now, using same URI for all - you can modify this
      const result = await updateNFTMetadata(nft.mint, metadataUri, nft.name);
      if (result) {
        success++;
      } else {
        failed++;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('Update Complete!');
    console.log(`Successful: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`${'='.repeat(60)}`);
  });
}

main().catch(console.error);
