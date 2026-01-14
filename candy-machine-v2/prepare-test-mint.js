const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, percentAmount, publicKey } = require('@metaplex-foundation/umi');
const { createNft, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// Setup UMI
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

// Load keypair
const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

const IMAGE_URL = 'https://cyan-certain-rodent-24.mypinata.cloud/ipfs/bafybeige6rnmls52dvpmwjdvd6eblzqgdpvjwtrozup4gb7brqra2umwku';

const testRecipients = [
  { address: 'DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH', name: 'Test Unify NFT #1' },
  { address: 'DFsR4Ex82qD77K2JRAr8xp6SK4th6ghuB8aU4nAgh4kZ', name: 'Test Unify NFT #2' }
];

// Create metadata for Pinata upload
const metadata = testRecipients.map((recipient, i) => ({
  name: recipient.name,
  symbol: "UNIFY",
  description: "Unify NFT Collection - Test Edition",
  image: IMAGE_URL,
  attributes: [
    { trait_type: "Edition", value: "Test" },
    { trait_type: "Number", value: `${i + 1}` }
  ],
  properties: {
    files: [{ uri: IMAGE_URL, type: "image/png" }],
    category: "image"
  }
}));

// Save metadata files for manual Pinata upload
const testMetadataDir = './test-metadata';
if (!fs.existsSync(testMetadataDir)) {
  fs.mkdirSync(testMetadataDir);
}

metadata.forEach((meta, i) => {
  fs.writeFileSync(`${testMetadataDir}/${i}.json`, JSON.stringify(meta, null, 2));
  console.log(`Created: ${testMetadataDir}/${i}.json`);
});

console.log('\n' + '='.repeat(60));
console.log('TEST MINT PREPARATION');
console.log('='.repeat(60));
console.log('\nMetadata files created. Next steps:');
console.log('1. Upload test-metadata folder to Pinata');
console.log('2. Get the folder CID');
console.log('3. Run: node test-mint.js YOUR_FOLDER_CID\n');

// Create the actual minting script
const mintScript = `const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, percentAmount, publicKey } = require('@metaplex-foundation/umi');
const { createNft, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

const folderCID = process.argv[2];
if (!folderCID) {
  console.error('Usage: node test-mint.js YOUR_FOLDER_CID');
  process.exit(1);
}

const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b')
  .use(mplTokenMetadata());

const keypairFile = fs.readFileSync(\`\${process.env.HOME}/.config/solana/id.json\`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(umiKeypair));

const recipients = [
  { address: 'DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH', name: 'Test #1' },
  { address: 'DFsR4Ex82qD77K2JRAr8xp6SK4th6ghuB8aU4nAgh4kZ', name: 'Test #2' }
];

async function mintTestNFT(recipientAddress, metadataUri, name) {
  try {
    console.log(\`\\nMinting \${name} to \${recipientAddress.substring(0, 10)}...\`);
    console.log(\`Metadata: \${metadataUri}\`);
    
    const mint = generateSigner(umi);
    
    await createNft(umi, {
      mint,
      name: \`Test Unify NFT \${name}\`,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5),
      creators: [{
        address: umiKeypair.publicKey,
        verified: true,
        share: 100
      }],
      tokenOwner: publicKey(recipientAddress),
    }).sendAndConfirm(umi);
    
    console.log(\`✅ Success! NFT Mint: \${mint.publicKey}\`);
    console.log(\`   Solscan: https://solscan.io/token/\${mint.publicKey}\`);
    return { success: true, mint: mint.publicKey };
  } catch (error) {
    console.log(\`❌ Failed: \${error.message}\`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Starting test mints...\\n');
  const results = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const uri = \`https://gateway.pinata.cloud/ipfs/\${folderCID}/\${i}.json\`;
    const result = await mintTestNFT(recipients[i].address, uri, \`#\${i + 1}\`);
    results.push({ ...result, recipient: recipients[i].address });
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log('\\n' + '='.repeat(60));
  console.log('TEST MINT COMPLETE');
  console.log('='.repeat(60));
  results.forEach((r, i) => {
    console.log(\`\\nTest #\${i + 1}: \${recipients[i].address.substring(0, 15)}...\`);
    if (r.success) {
      console.log(\`  ✅ NFT: \${r.mint}\`);
      console.log(\`  Check Phantom wallet in a few minutes\`);
    } else {
      console.log(\`  ❌ Error: \${r.error}\`);
    }
  });
  console.log('\\nIf NFTs appear in Phantom, we can proceed with full batch!\\n');
}

main().catch(console.error);`;

fs.writeFileSync('./test-mint.js', mintScript);
console.log('Created test-mint.js\n');
