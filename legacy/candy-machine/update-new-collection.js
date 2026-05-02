const { Metaplex, keypairIdentity, irysStorage } = require('@metaplex-foundation/js');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function updateNewCollectionMetadata() {
    try {
        console.log('🔄 Updating NEW collection metadata...\n');

        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        console.log('✅ Connected to Solana mainnet');

        const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
        console.log(`✅ Loaded wallet: ${keypair.publicKey.toBase58()}\n`);

        const metaplex = Metaplex.make(connection)
            .use(keypairIdentity(keypair))
            .use(irysStorage());

        const newCollectionMint = new PublicKey('3PqcwhKxV6Jyq7Vx8vzYvLXFuU5d73q3SygkcVT7efUq');
        console.log(`📝 Collection Mint: ${newCollectionMint.toBase58()}`);

        const nft = await metaplex.nfts().findByMint({ mintAddress: newCollectionMint });
        console.log(`✅ Found collection: ${nft.name}\n`);

        console.log('⏳ Uploading collection image to Arweave...');
        const imageBuffer = fs.readFileSync('./assets/collection.png');
        const imageUri = await metaplex.storage().upload(imageBuffer);
        console.log(`✅ Image uploaded: ${imageUri}\n`);

        const enhancedMetadata = {
            name: "Epstain NFT",
            symbol: "EPNFT",
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
            name: "Epstain NFT",
            uri: uri
        });

        console.log('\n🎉 Collection metadata updated successfully!\n');
        console.log('✅ Your candy machine collection now has proper metadata with social links');
        console.log(`🔗 View on Explorer: https://explorer.solana.com/address/${newCollectionMint.toBase58()}?cluster=mainnet-beta\n`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateNewCollectionMetadata();
