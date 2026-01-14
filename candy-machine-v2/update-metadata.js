const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { updateV1, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const https = require('https');
const FormData = require('form-data');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Load keypair (update authority)
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const updateAuthority = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(updateAuthority));

// NFT mints that need updating
const nftMints = [
  'EdRmMduVyAeUJ6e1RPsfyWCr4VYJDGMH4KZvXV3yssNV',
  '2YygteSRPPFohxDaia9v3zWWvf9A2agjUqc5rK2r9GEq',
  'FtdTaubjQWM62sepuo2bNbqqfWHKj9cSzbNAvKU1a2oo',
  'DRPt2RAhEnZ6huYjVu6Dypc93BQ6UryyFLrjEWXSJorv',
  '4B66YtiM8KvfJMybk7qbyYYkyys2TmpwbGj1V1TjnS19',
  '4GrUvb67Sir6RfFDNpLGu8hW2MUv3o1RyoCrS8eYY6VS',
  'AkxaMMLWS4nTmRDcPyp3Wj5uFeoUvAi4ynfFjoJwYukw',
  '8DN4fES2RTzwc1A4kFva1r92EWibDEEReEwjoYYsaRdA',
  '45W5cCQRuZPVtmLmUq4rfmvs54aAGXwKuqi2x5mUTr3J',
  'EUkKoMEkg5ib2CqvdfmfwZ864xZkbUj4uzT21BscV2YG',
  '75k5aRRvY9ffeymuw8DxzeaLNEyuMQm3bdfsyPCSJcXC',
  'Gf18cG5y7fPYbs1fxuxEQZ9jGgyqY5vTaXgfnT8kX3a7',
  '8Exxe1YhCVUjsjcdigGXSDaeRBuXBdNrNFuRY6RJwLXX',
  '4TBpPjrVWg9DVUQjVQ5XNKsqKZHzJYWdNiWqNU5KDu7B'
];

// Upload to Pinata IPFS
async function uploadToPinata(content, filename, apiKey, apiSecret) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', Buffer.from(JSON.stringify(content)), {
      filename: filename,
      contentType: 'application/json',
    });

    const options = {
      method: 'POST',
      hostname: 'api.pinata.cloud',
      path: '/pinning/pinFileToIPFS',
      headers: {
        ...form.getHeaders(),
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': apiSecret
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.IpfsHash) {
            resolve(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
          } else {
            reject(new Error(data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

// Simple alternative: use publicly available IPFS gateway
async function uploadToPublicIPFS(content, filename) {
  // For now, we'll use a simple approach: upload image to imgur or similar
  // Then create metadata pointing to it
  // Since we don't have API keys, let's just create GitHub raw URLs
  
  // Actually, let's use a different approach - host on GitHub
  console.log('For production, you would upload to IPFS/Pinata with API keys');
  console.log('For now, using temporary solution...');
  
  // Return a placeholder - in reality we'd need API keys or manual upload
  return null;
}

async function updateNFTMetadata(mintAddress, newMetadataUri) {
  try {
    console.log(`\nUpdating NFT: ${mintAddress}`);
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
  console.log('NFT Metadata Update Tool\n');
  console.log('To proceed, we need:');
  console.log('1. Upload images to a new hosting service (IPFS, Imgur, GitHub, etc.)');
  console.log('2. Create new metadata JSON files pointing to new image URLs');
  console.log('3. Upload metadata to IPFS or similar');
  console.log('4. Update all 14 NFTs on-chain\n');
  
  console.log('Options:');
  console.log('A) Provide Pinata API keys (free account at pinata.cloud)');
  console.log('B) Manually upload images to Imgur/GitHub and provide URLs');
  console.log('C) Use NFT.Storage (requires API key from nft.storage)\n');
  
  console.log('This script is ready to update NFTs once we have new metadata URIs.');
  console.log('Would you like to:');
  console.log('1. Create a Pinata account and get API keys (recommended)');
  console.log('2. Upload images manually to Imgur and provide links');
  console.log('3. Something else');
}

main().catch(console.error);
