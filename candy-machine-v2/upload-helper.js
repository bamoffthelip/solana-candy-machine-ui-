const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// You'll need to set your Pinata API keys
const PINATA_API_KEY = 'YOUR_API_KEY';
const PINATA_SECRET_KEY = 'YOUR_SECRET_KEY';

// For now, let's just create the files in a format ready for Pinata's web UI upload
console.log('\n' + '='.repeat(60));
console.log('UPLOAD TO PINATA');
console.log('='.repeat(60));
console.log('\nOption 1: Upload via Pinata Web UI');
console.log('1. Go to https://app.pinata.cloud/');
console.log('2. Click "Upload" > "Folder"');
console.log('3. Select the test-metadata folder');
console.log('4. Copy the folder CID after upload\n');
console.log('Option 2: Use curl (if you have API keys):');
console.log('tar -czf test-metadata.tar.gz test-metadata/');
console.log('curl -X POST https://api.pinata.cloud/pinning/pinFileToIPFS \\');
console.log('  -H "pinata_api_key: YOUR_KEY" \\');
console.log('  -H "pinata_secret_api_key: YOUR_SECRET" \\');
console.log('  -F "file=@test-metadata.tar.gz"\n');
console.log('After upload, run:');
console.log('node test-mint.js YOUR_FOLDER_CID\n');
