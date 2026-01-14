const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { transferV1, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { findAssociatedTokenPda } = require('@metaplex-foundation/mpl-toolbox');
const fs = require('fs');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Transfers to perform
const transfers = [
  {
    fromKeypair: `${process.env.HOME}/.config/solana/id-old.json`,
    nftMint: 'Gf18cG5y7fPYbs1fxuxEQZ9jGgyqY5vTaXgfnT8kX3a7',
    toAddress: 'C6zS6kDTrhYC4469sWwT7eH5VkRMdHtvxEyKm2Zf4tH',
    description: 'DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH -> C6zS6kDTrhYC4469sWwT7eH5VkRMdHtvxEyKm2Zf4tH'
  }
];

async function transferNFT(fromKeypairPath, nftMintAddress, toAddress, description) {
  try {
    console.log(`\nTransferring: ${description}`);
    console.log(`NFT: ${nftMintAddress}`);
    
    // Load keypair
    const keypairFile = fs.readFileSync(fromKeypairPath, 'utf8');
    const keypairArray = JSON.parse(keypairFile);
    const secretKey = Uint8Array.from(keypairArray);
    const fromKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    
    // Set identity
    umi.use(keypairIdentity(fromKeypair));
    
    const mint = publicKey(nftMintAddress);
    const destination = publicKey(toAddress);
    
    // Transfer the NFT
    await transferV1(umi, {
      mint,
      authority: fromKeypair,
      tokenOwner: fromKeypair.publicKey,
      destinationOwner: destination,
      tokenStandard: 'NonFungible',
    }).sendAndConfirm(umi);
    
    console.log(`✅ Transfer successful!`);
    return true;
  } catch (error) {
    console.log(`❌ Transfer failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting NFT transfers...\n');
  
  let success = 0;
  let failed = 0;
  
  for (const transfer of transfers) {
    const result = await transferNFT(
      transfer.fromKeypair,
      transfer.nftMint,
      transfer.toAddress,
      transfer.description
    );
    
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('Transfer complete!');
  console.log(`Successful: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(40));
  
  if (failed > 0) {
    console.log('\nFor the other 2 NFTs, you\'ll need to transfer manually from Phantom or provide keypairs.');
  }
}

main().catch(console.error);
