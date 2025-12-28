const { Metaplex, keypairIdentity, irysStorage } = require('@metaplex-foundation/js');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function updateCollectionMetadata() {
    try {
        console.log('🔄 Starting collection metadata update...\n');

        // 1. Setup connection
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        console.log('✅ Connected to Solana mainnet');

        // 2. Load wallet
        const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
        console.log(`✅ Loaded wallet: ${keypair.publicKey.toBase58()}\n`);

        // 3. Setup Metaplex
        const metaplex = Metaplex.make(connection)
            .use(keypairIdentity(keypair))
            .use(irysStorage());

        // 4. Load collection mint address
        const collectionMint = new PublicKey(fs.readFileSync('./.collection-mint', 'utf8').trim());
        console.log(`📝 Collection Mint: ${collectionMint.toBase58()}`);

        // 5. Fetch current NFT data
        const nft = await metaplex.nfts().findByMint({ mintAddress: collectionMint });
        console.log(`✅ Found collection: ${nft.name}\n`);

        // 6. Upload the collection image to Arweave
        console.log('⏳ Uploading collection image to Arweave...');
        const imageBuffer = fs.readFileSync('./0.png');
        const imageUri = await metaplex.storage().upload(imageBuffer);
        console.log(`✅ Image uploaded: ${imageUri}\n`);

        // 7. Enhanced metadata with social links and proper image
        const enhancedMetadata = {
            name: nft.name,
            symbol: nft.symbol,
            description: "Epstain Meme Coin NFT Collection for Epstain enthusiasts. Own a piece of the meme culture with our exclusive NFTs.",
            image: imageUri,
            attributes: [],
            properties: {
                files: [
                    {
                        uri: imageUri,
                        type: "image/png"
                    }
                ],
                category: "image",
                creators: [
                    {
                        address: keypair.publicKey.toBase58(),
                        share: 100
                    }
                ]
            },
            // Social links for legitimacy
            external_url: "https://epstaincoin.com/",
            twitter: "https://x.com/epstaincoinsol",
            telegram: "https://t.me/+3yoGd_nruVMwNGEx",
            website: "https://epstaincoin.com/"
        };

        console.log('⏳ Uploading updated metadata to Arweave...');
        const { uri } = await metaplex.nfts().uploadMetadata(enhancedMetadata);
        console.log(`✅ New metadata URI: ${uri}\n`);

        console.log('⏳ Updating on-chain metadata...');
        await metaplex.nfts().update({
            nftOrSft: nft,
            uri: uri
        });

        console.log('\n🎉 Collection metadata updated successfully!\n');
        console.log('✅ Your collection now has enhanced metadata for legitimacy');
        console.log(`🔗 View on Explorer: https://explorer.solana.com/address/${collectionMint.toBase58()}?cluster=mainnet-beta\n`);

    } catch (error) {
        console.error('❌ Error updating metadata:', error);
        process.exit(1);
    }
}

updateCollectionMetadata();
