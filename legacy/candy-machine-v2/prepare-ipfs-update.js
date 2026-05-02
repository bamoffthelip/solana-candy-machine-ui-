const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { updateV1, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const https = require('https');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Load keypair
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const updateAuthority = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(updateAuthority));

const IPFS_IMAGE_CID = 'bafybeig5l5s3eyaf7ddbuqkbijgzqouy7d6daex4h66anayv2tz7etcvte';
const IPFS_IMAGE_URL = `https://gateway.pinata.cloud/ipfs/${IPFS_IMAGE_CID}`;

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

// Create metadata JSON for each NFT
function createMetadata(index, name) {
  return {
    name: name,
    symbol: "UNIFY",
    description: "Unify NFT Collection - Exclusive member edition",
    image: IPFS_IMAGE_URL,
    attributes: [
      { trait_type: "Background", value: "Blue" },
      { trait_type: "Rarity", value: "Common" }
    ],
    properties: {
      files: [{ uri: IPFS_IMAGE_URL, type: "image/png" }],
      category: "image"
    }
  };
}

// Upload to web3.storage (no auth needed for small files via their public gateway)
async function uploadToIPFS(jsonContent, filename) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(jsonContent);
    
    const options = {
      method: 'POST',
      hostname: 'api.nft.storage',
      path: '/upload',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGQwNzQ4MzI1OTQ4MjlmZjg5MzEwMTQ5QjcxNjI1QmU4NzcxMjU0NzQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3MjUzMTIwMDAwMCwibmFtZSI6ImRlbW8ifQ.demo' // Demo token - will likely fail
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log(`Response for ${filename}:`, responseData);
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(responseData);
            resolve(result.value?.cid);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function updateNFT(mintAddress, metadataUri, name) {
  try {
    console.log(`\nUpdating ${name}...`);
    console.log(`New URI: ${metadataUri}`);
    
    const mint = publicKey(mintAddress);
    
    await updateV1(umi, {
      mint,
      authority: updateAuthority,
      data: { uri: metadataUri },
    }).sendAndConfirm(umi);
    
    console.log('✅ Success!');
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Creating metadata files locally...\n');
  
  // Create metadata directory
  const metadataDir = './ipfs-metadata';
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir);
  }
  
  // Create all metadata files
  for (const nft of nftData) {
    const metadata = createMetadata(nft.index, nft.name);
    const filename = `${metadataDir}/${nft.index}.json`;
    fs.writeFileSync(filename, JSON.stringify(metadata, null, 2));
    console.log(`Created: ${filename}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('NEXT STEP: Upload metadata to Pinata');
  console.log('='.repeat(60));
  console.log('\n1. Go to https://pinata.cloud and login');
  console.log('2. Click "Upload" → "Folder"');
  console.log(`3. Select the ${metadataDir} folder`);
  console.log('4. After upload, copy the folder CID');
  console.log('5. The metadata URLs will be:');
  console.log('   https://gateway.pinata.cloud/ipfs/YOUR_FOLDER_CID/0.json');
  console.log('   https://gateway.pinata.cloud/ipfs/YOUR_FOLDER_CID/1.json');
  console.log('   ... etc\n');
  console.log('Once you have the folder CID, run:');
  console.log('   node update-from-ipfs.js YOUR_FOLDER_CID\n');
  
  // Create the update script
  const updateScript = `const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { updateV1, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

const folderCID = process.argv[2];
if (!folderCID) {
  console.error('Usage: node update-from-ipfs.js YOUR_FOLDER_CID');
  process.exit(1);
}

const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

const keypairFile = fs.readFileSync(\`\${process.env.HOME}/.config/solana/id.json\`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const updateAuthority = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(updateAuthority));

const nftData = ${JSON.stringify(nftData, null, 2)};

async function updateNFT(mint, uri, name) {
  try {
    console.log(\`Updating \${name}...\`);
    await updateV1(umi, {
      mint: publicKey(mint),
      authority: updateAuthority,
      data: { uri },
    }).sendAndConfirm(umi);
    console.log('✅ Success!');
    return true;
  } catch (error) {
    console.log(\`❌ Failed: \${error.message}\`);
    return false;
  }
}

async function main() {
  console.log('Updating all 14 NFTs...\\n');
  let success = 0, failed = 0;
  
  for (const nft of nftData) {
    const uri = \`https://gateway.pinata.cloud/ipfs/\${folderCID}/\${nft.index}.json\`;
    const result = await updateNFT(nft.mint, uri, nft.name);
    if (result) success++; else failed++;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(\`\\nComplete! Success: \${success}, Failed: \${failed}\`);
}

main().catch(console.error);`;
  
  fs.writeFileSync('./update-from-ipfs.js', updateScript);
  console.log('Created update-from-ipfs.js\n');
}

main().catch(console.error);
