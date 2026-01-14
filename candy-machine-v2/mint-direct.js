const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, percentAmount, publicKey } = require('@metaplex-foundation/umi');
const { createNft, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// Load keypair
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);

// Load addresses
const addresses = fs.readFileSync('addresses-remaining.txt', 'utf8').trim().split('\n').filter(a => a.trim());

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Convert Solana keypair to UMI format
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

// Load metadata from cache
const cache = JSON.parse(fs.readFileSync('cache.json', 'utf8'));

async function mintNFT(index, recipientAddress) {
  try {
    const metadata = cache.items[index.toString()];
    if (!metadata) {
      console.log(`❌ No metadata found for index ${index}`);
      return false;
    }

    console.log(`Minting "${metadata.name}" to ${recipientAddress}...`);
    
    const mint = generateSigner(umi);
    
    await createNft(umi, {
      mint,
      name: metadata.name,
      uri: metadata.metadata_link,
      sellerFeeBasisPoints: percentAmount(5),
      creators: [{
        address: umiKeypair.publicKey,
        verified: true,
        share: 100
      }],
      tokenOwner: publicKey(recipientAddress),
    }).sendAndConfirm(umi);
    
    console.log(`✅ Success! NFT: ${mint.publicKey}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting direct NFT minting (no candy machine)...');
  console.log(`Minting ${addresses.length} NFTs`);
  console.log('');
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i].trim();
    if (!address) continue;
    
    const result = await mintNFT(i + 5, address);  // Start from index 5
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // Wait between mints
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log('');
  console.log('='.repeat(40));
  console.log(`Minting complete!`);
  console.log(`Successful: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(40));
}

main().catch(console.error);
