const fs = require('fs');

const imageCID = process.argv[2] || 'bafybeia575s6nzx4pfecxeh3xzdj52uh4rcdz6mtuer5nktgldpjzcqc5q';
const count = parseInt(process.argv[3]) || 2;

console.log('='.repeat(60));
console.log('CREATING CNFT METADATA FILES FOR PINATA UPLOAD');
console.log('='.repeat(60));
console.log(`\nImage CID: ${imageCID}`);
console.log(`Creating ${count} metadata files\n`);

const dir = './cnft-metadata';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

for (let i = 0; i < count; i++) {
  const metadata = {
    name: `Unify NFT #${i}`,
    symbol: 'UNIFY',
    description: 'Unify NFT Collection',
    image: `https://gateway.pinata.cloud/ipfs/${imageCID}`,
    attributes: [
      { trait_type: 'Edition', value: 'cNFT' },
      { trait_type: 'Number', value: String(i) }
    ],
    properties: {
      files: [
        {
          uri: `https://gateway.pinata.cloud/ipfs/${imageCID}`,
          type: 'image/png'
        }
      ],
      category: 'image'
    }
  };

  fs.writeFileSync(`${dir}/${i}.json`, JSON.stringify(metadata, null, 2));
  console.log(`Created ${dir}/${i}.json`);
}

console.log('\n' + '='.repeat(60));
console.log('NEXT STEPS');
console.log('='.repeat(60));
console.log('\n1. Upload the cnft-metadata folder to Pinata:');
console.log('   - Go to https://app.pinata.cloud/');
console.log('   - Upload > Folder');
console.log('   - Select cnft-metadata folder');
console.log('   - Copy the folder CID\n');
console.log('2. Run: node cnft-batch-mint-v3.js addresses.txt <FOLDER_CID>\n');
