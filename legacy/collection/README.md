# Create Your Own Verified Collection

This guide will help you create a collection NFT that YOU control, avoiding Phantom wallet blocks.

## Step 1: Prepare Collection Assets

### Required Files:
1. **Collection Image** - Place your collection logo/artwork as `0.png` in this folder
   - Recommended: 1000x1000px PNG
   - Should represent your entire collection

2. **Collection Metadata** - Edit `collection.json` with:
   - `name`: Your collection name
   - `symbol`: 3-10 character ticker (e.g., "MYART")
   - `description`: Detailed, professional description
   - `image`: Keep as "0.png"

### Important for Avoiding Wallet Blocks:

**DO:**
✅ Use professional, descriptive collection name
✅ Write detailed description (at least 2-3 sentences)
✅ Use high-quality images
✅ Include website/social links if possible
✅ Be clear about the project's purpose

**DON'T:**
❌ Use generic names like "NFT Collection"
❌ Leave description empty or vague
❌ Use low-quality or suspicious images
❌ Copy other projects' branding

## Step 2: Install Sugar CLI

```bash
bash <(curl -sSf https://sugar.metaplex.com/install.sh)
```

Verify installation:
```bash
sugar --version
```

## Step 3: Configure Solana CLI

Set to mainnet and your wallet:
```bash
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/id.json
```

**Check your balance (you'll need ~0.02 SOL for collection creation):**
```bash
solana balance
```

## Step 4: Create Collection NFT

From the `collection` directory:

```bash
cd /home/jfranklinsantos/working/solana-candy-machine-ui-/collection
sugar collection create
```

This will:
- Upload your collection image and metadata
- Create the collection NFT
- Make YOU the Update Authority
- Give you the Collection Mint Address

**Save the Collection Mint Address** - you'll need it!

## Step 5: Verify on Solana Explorer

Check your new collection:
```
https://explorer.solana.com/address/YOUR_COLLECTION_MINT?cluster=mainnet-beta
```

Verify:
- ✅ Update Authority = Your wallet (DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH)
- ✅ Metadata shows your collection name/image
- ✅ You can see the collection NFT

## Step 6: Get Verified (Important!)

To get the verified checkmark and avoid wallet blocks:

### Option A: Magic Eden (Recommended)
1. Go to https://magiceden.io/
2. Connect wallet
3. Submit collection for verification
4. Provide: Website, Twitter, Discord
5. Wait 1-3 days for approval

### Option B: Tensor
1. Go to https://www.tensor.trade/
2. Submit collection
3. Complete verification process

### Option C: Metaplex Certified Collections
Once you have some NFTs minted, you can self-certify on-chain.

## Step 7: Update Your Candy Machine Config

Once you have your new Collection Mint Address, update `.env.local`:

```bash
NEXT_PUBLIC_COLLECTION_MINT=YOUR_NEW_COLLECTION_MINT_ADDRESS
```

## Step 8: Deploy Candy Machine with Your Collection

```bash
# From your candy machine folder
sugar launch --collection YOUR_NEW_COLLECTION_MINT_ADDRESS
```

Sugar will:
- Deploy candy machine on mainnet
- Link it to YOUR collection (that you control)
- Set proper authorities
- Give you the Candy Machine ID

## Step 9: Add Candy Machine ID to Config

Update `.env.local`:
```bash
NEXT_PUBLIC_CANDY_MACHINE_ID=YOUR_CANDY_MACHINE_ID
```

## Why This Avoids Phantom Blocks

✅ **YOU are Update Authority** - Not a suspicious third-party address
✅ **YOUR wallet mints** - Not Crossmint's flagged address
✅ **Proper metadata** - Complete, professional collection info
✅ **Marketplace verification** - Optional but helps legitimacy
✅ **Clean on-chain structure** - Follows Metaplex standards

## Troubleshooting

### "Insufficient funds"
You need SOL in your wallet for:
- Collection creation: ~0.02 SOL
- Candy Machine deployment: ~0.5-1 SOL
- Transaction fees: small amounts

### "Authority mismatch"
Make sure your Solana CLI is using the correct keypair:
```bash
solana address
# Should show: DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH
```

### Image upload fails
- Check image is under 10MB
- Use PNG or JPG format
- Ensure stable internet connection

## Next Steps After Creation

1. ✅ Create collection NFT
2. ✅ Deploy Candy Machine linked to your collection
3. ✅ Mint test NFT
4. ✅ Verify it appears in collection
5. ✅ Submit for marketplace verification
6. ✅ Deploy to production

---

**Need help at any step? Just ask!**
