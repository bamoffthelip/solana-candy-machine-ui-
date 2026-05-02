const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function checkCollection() {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    
    const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
    
    const collectionMint = new PublicKey('3PqcwhKxV6Jyq7Vx8vzYvLXFuU5d73q3SygkcVT7efUq');
    
    const nft = await metaplex.nfts().findByMint({ mintAddress: collectionMint });
    
    console.log('Collection Details:');
    console.log('Name:', nft.name);
    console.log('Symbol:', nft.symbol);
    console.log('URI:', nft.uri);
    console.log('Update Authority:', nft.updateAuthorityAddress.toBase58());
    console.log('\nJSON Metadata:');
    console.log('Description:', nft.json?.description);
    console.log('Image:', nft.json?.image);
    console.log('External URL:', nft.json?.external_url);
    console.log('Twitter:', nft.json?.twitter);
}

checkCollection().catch(console.error);
