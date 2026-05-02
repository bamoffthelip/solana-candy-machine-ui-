const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, percentAmount, publicKey } = require('@metaplex-foundation/umi');
const { createNft, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

const IMAGE_URL = 'https://cyan-certain-rodent-24.mypinata.cloud/ipfs/bafybeige6rnmls52dvpmwjdvd6eblzqgdpvjwtrozup4gb7brqra2umwku';

const recipients = [
  { address: 'DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH', name: 'Test Unify NFT #1' },
  { address: 'DFsR4Ex82qD77K2JRAr8xp6SK4th6ghuB8aU4nAgh4kZ', name: 'Test Unify NFT #2' }
];

async function mintTestNFT(recipientAddress, name, index) {
  try {
    console.log(`\nMinting "${name}" to ${recipientAddress.substring(0, 20)}...`);
    
    const mint = generateSigner(umi);
    
    // Create metadata inline - Metaplex handles JSON internally
    const metadata = {
      name: name,
      symbol: "UNIFY",
      description: "Unify NFT Collection - Clean Test Edition",
      image: IMAGE_URL,
      attributes: [
        { trait_type: "Edition", value: "Test" },
        { trait_type: "Number", value: `${index + 1}` }
      ],
      properties: {
        files: [{ uri: IMAGE_URL, type: "image/png" }],
        category: "image"
      }
    };

    // Create a data URI with the metadata
    const metadataJson = JSON.stringify(metadata);
    const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;
    
    await createNft(umi, {
      mint,
      name: name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5),
      creators: [{
        address: umiKeypair.publicKey,
        verified: true,
        share: 100
      }],
      tokenOwner: publicKey(recipientAddress),
    }).sendAndConfirm(umi);
    
    console.log(`✅ Success!`);
    console.log(`   NFT Mint: ${mint.publicKey}`);
    console.log(`   Solscan: https://solscan.io/token/${mint.publicKey}`);
    return { success: true, mint: mint.publicKey, recipient: recipientAddress };
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message, recipient: recipientAddress };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST MINT - INLINE METADATA');
  console.log('='.repeat(60));
  console.log(`\nImage: ${IMAGE_URL}`);
  console.log(`Creator: ${umiKeypair.publicKey}`);
  console.log(`\nMinting 2 test NFTs...`);
  
  const results = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const result = await mintTestNFT(recipients[i].address, recipients[i].name, i);
    results.push(result);
    if (i < recipients.length - 1) {
      console.log('\nWaiting 3 seconds before next mint...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST MINT COMPLETE');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\nResults: ${successful.length} successful, ${failed.length} failed\n`);
  
  if (successful.length > 0) {
    console.log('✅ Successfully minted:');
    successful.forEach((r, i) => {
      console.log(`\n   Test #${i + 1}:`);
      console.log(`   Recipient: ${r.recipient}`);
      console.log(`   NFT: ${r.mint}`);
      console.log(`   Solscan: https://solscan.io/token/${r.mint}`);
    });
    console.log('\n⏱️  Wait 5-10 minutes, then check Phantom wallet!');
    console.log('   If NFTs appear, we can proceed with full collection.');
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed mints:');
    failed.forEach((r, i) => {
      console.log(`   ${r.recipient}: ${r.error}`);
    });
  }
  
  console.log('');
}

main().catch(console.error);
