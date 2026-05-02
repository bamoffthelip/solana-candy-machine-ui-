const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
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

const keypairFile = fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8');
const keypairArray = JSON.parse(keypairFile);
const secretKey = Uint8Array.from(keypairArray);
const updateAuthority = umi.eddsa.createKeypairFromSecretKey(secretKey);
umi.use(keypairIdentity(updateAuthority));

const nftData = [
  {
    "index": 0,
    "mint": "EdRmMduVyAeUJ6e1RPsfyWCr4VYJDGMH4KZvXV3yssNV",
    "name": "Unify NFT #0"
  },
  {
    "index": 1,
    "mint": "2YygteSRPPFohxDaia9v3zWWvf9A2agjUqc5rK2r9GEq",
    "name": "Unify NFT #1"
  },
  {
    "index": 2,
    "mint": "FtdTaubjQWM62sepuo2bNbqqfWHKj9cSzbNAvKU1a2oo",
    "name": "Unify NFT #2"
  },
  {
    "index": 3,
    "mint": "DRPt2RAhEnZ6huYjVu6Dypc93BQ6UryyFLrjEWXSJorv",
    "name": "Unify NFT #3"
  },
  {
    "index": 4,
    "mint": "4B66YtiM8KvfJMybk7qbyYYkyys2TmpwbGj1V1TjnS19",
    "name": "Unify NFT #4"
  },
  {
    "index": 5,
    "mint": "4GrUvb67Sir6RfFDNpLGu8hW2MUv3o1RyoCrS8eYY6VS",
    "name": "Unify NFT #5"
  },
  {
    "index": 6,
    "mint": "AkxaMMLWS4nTmRDcPyp3Wj5uFeoUvAi4ynfFjoJwYukw",
    "name": "Unify NFT #6"
  },
  {
    "index": 7,
    "mint": "8DN4fES2RTzwc1A4kFva1r92EWibDEEReEwjoYYsaRdA",
    "name": "Unify NFT #7"
  },
  {
    "index": 8,
    "mint": "45W5cCQRuZPVtmLmUq4rfmvs54aAGXwKuqi2x5mUTr3J",
    "name": "Unify NFT #8"
  },
  {
    "index": 9,
    "mint": "EUkKoMEkg5ib2CqvdfmfwZ864xZkbUj4uzT21BscV2YG",
    "name": "Unify NFT #9"
  },
  {
    "index": 10,
    "mint": "75k5aRRvY9ffeymuw8DxzeaLNEyuMQm3bdfsyPCSJcXC",
    "name": "Unify NFT #10"
  },
  {
    "index": 11,
    "mint": "Gf18cG5y7fPYbs1fxuxEQZ9jGgyqY5vTaXgfnT8kX3a7",
    "name": "Unify NFT #11"
  },
  {
    "index": 12,
    "mint": "8Exxe1YhCVUjsjcdigGXSDaeRBuXBdNrNFuRY6RJwLXX",
    "name": "Unify NFT #12"
  },
  {
    "index": 13,
    "mint": "4TBpPjrVWg9DVUQjVQ5XNKsqKZHzJYWdNiWqNU5KDu7B",
    "name": "Unify NFT #13"
  }
];

async function updateNFT(mint, uri, name) {
  try {
    console.log(`Updating ${name}...`);
    console.log(`URI: ${uri}`);
    await updateV1(umi, {
      mint: publicKey(mint),
      authority: updateAuthority,
      data: { 
        name: name,
        symbol: 'UNIFY',
        uri: uri,
        sellerFeeBasisPoints: 500,
        creators: [{
          address: updateAuthority.publicKey,
          verified: true,
          share: 100
        }]
      },
    }).sendAndConfirm(umi);
    console.log('✅ Success!');
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Updating all 14 NFTs...\n');
  let success = 0, failed = 0;
  
  for (const nft of nftData) {
    const uri = `https://gateway.pinata.cloud/ipfs/${folderCID}/${nft.index}.json`;
    const result = await updateNFT(nft.mint, uri, nft.name);
    if (result) success++; else failed++;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\nComplete! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);