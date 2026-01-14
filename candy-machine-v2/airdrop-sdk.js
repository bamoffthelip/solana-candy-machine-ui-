const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity } = require('@metaplex-foundation/umi');
const { mintV2, mplCandyMachine, fetchCandyMachine } = require('@metaplex-foundation/mpl-candy-machine');
const { publicKey } = require('@metaplex-foundation/umi');
const fs = require('fs');
const bs58 = require('bs58');

// Load keypair
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);

// Load addresses
const addresses = fs.readFileSync('addresses.txt', 'utf8').trim().split('\n');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplCandyMachine());

// Convert Solana keypair to UMI format
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

const candyMachineId = publicKey('FvSGdhxr3S9VvRnt5uLghSEAuuN9iLtAT7S8s9paUUVD');

async function mintToAddress(address) {
  try {
    console.log(`Minting to ${address}...`);
    const tx = await mintV2(umi, {
      candyMachine: candyMachineId,
      mintAuthority: umiKeypair,
      nftOwner: publicKey(address),
    }).sendAndConfirm(umi);
    
    console.log(`✅ Success! TX: ${bs58.encode(tx.signature)}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting airdrop...');
  console.log(`Candy Machine: ${candyMachineId}`);
  console.log(`${addresses.length} addresses to mint`);
  console.log('');
  
  let success = 0;
  let failed = 0;
  
  for (const address of addresses) {
    if (!address.trim()) continue;
    const result = await mintToAddress(address.trim());
    if (result) {
      success++;
    } else {
      failed++;
    }
    // Wait a bit between mints
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('');
  console.log('='.repeat(40));
  console.log(`Airdrop complete!`);
  console.log(`Successful: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(40));
}

main().catch(console.error);
