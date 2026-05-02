const { Metaplex, keypairIdentity, irysStorage } = require('@metaplex-foundation/js');
const { Connection, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function createCollectionNFT() {
    try {
        console.log('🚀 Starting collection NFT creation...\n');

        // 1. Setup connection to Solana mainnet
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        console.log('✅ Connected to Solana mainnet');

        // 2. Load wallet keypair
        const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
        console.log(`✅ Loaded wallet: ${keypair.publicKey.toBase58()}`);

        // 3. Setup Metaplex
        const metaplex = Metaplex.make(connection)
            .use(keypairIdentity(keypair))
            .use(irysStorage());
        
        console.log('✅ Metaplex instance created\n');

        // 4. Load collection metadata and image
        const collectionJson = JSON.parse(fs.readFileSync('./collection.json', 'utf8'));
        const imageBuffer = fs.readFileSync('./0.png');
        
        console.log(`📝 Collection Name: ${collectionJson.name}`);
        console.log(`📝 Collection Symbol: ${collectionJson.symbol}`);
        console.log(`📝 Description: ${collectionJson.description}\n`);

        // 5. Upload image first
        console.log('⏳ Uploading image to Arweave...');
        const imageFile = await metaplex.storage().upload(imageBuffer);
        console.log(`✅ Image uploaded: ${imageFile}`);

        // 6. Upload and create collection NFT with proper metadata
        console.log('⏳ Creating collection NFT on-chain...');
        const { nft } = await metaplex.nfts().create({
            name: collectionJson.name,
            symbol: collectionJson.symbol,
            uri: imageFile, // Use the uploaded image
            sellerFeeBasisPoints: 0,
            isCollection: true,
            updateAuthority: keypair,
            creators: [
                {
                    address: keypair.publicKey,
                    share: 100
                }
            ]
        }, {
            commitment: 'confirmed'
        });

        console.log('\n🎉 Collection NFT created successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Collection Mint Address: ${nft.address.toBase58()}`);
        console.log(`Update Authority: ${keypair.publicKey.toBase58()}`);
        console.log(`Name: ${nft.name}`);
        console.log(`Symbol: ${nft.symbol}`);
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('🔗 View on Solana Explorer:');
        console.log(`https://explorer.solana.com/address/${nft.address.toBase58()}?cluster=mainnet-beta\n`);

        console.log('💾 Save this Collection Mint Address for your candy machine!');
        
        // Save the collection mint address to a file
        fs.writeFileSync('./.collection-mint', nft.address.toBase58());
        console.log('✅ Collection mint address saved to .collection-mint file');

    } catch (error) {
        console.error('❌ Error creating collection NFT:', error);
        process.exit(1);
    }
}

createCollectionNFT();
