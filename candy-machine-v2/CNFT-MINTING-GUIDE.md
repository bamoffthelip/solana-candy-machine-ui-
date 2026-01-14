# Compressed NFT (cNFT) Minting Guide

## Overview

This guide covers how to mint compressed NFTs to multiple wallet addresses using your existing merkle tree and collection.

**Your Infrastructure:**
| Resource | Address |
|----------|---------|
| Collection NFT | `DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM` |
| Merkle Tree | `E3Do6eop2Bf2vv3nRCdsaE9uqosYyEaAe3zA1MNQNkUG` |
| Authority Wallet | `66LDYvh9wso6Q8xtvSorh7BcP3sBgJrq9g5QXMNJfjtt` |
| Tree Capacity | 16,384 cNFTs |
| Cost per mint | ~0.00005 SOL (~$0.005) |

---

## Quick Start (5 Minutes)

### Step 1: Prepare Wallet Addresses

Create or edit `addresses.txt` with one Solana wallet address per line:

```
Address1Here
Address2Here
Address3Here
```

### Step 2: Prepare Metadata Files

For each address, you need a corresponding JSON metadata file (0.json, 1.json, 2.json, etc.)

**Option A: Use the existing metadata generator**
```bash
cd ~/working/solana-candy-machine-ui-/candy-machine-v2
node cnft-prepare-metadata.js <NUMBER_OF_NFTS>
```

**Option B: Manually create files in `cnft-metadata/` folder**

Each file should follow this format:
```json
{
  "name": "Unify NFT #0",
  "symbol": "UNIFY",
  "description": "Unify NFT Collection",
  "image": "https://gateway.pinata.cloud/ipfs/YOUR_IMAGE_CID",
  "attributes": [
    { "trait_type": "Edition", "value": "cNFT" },
    { "trait_type": "Number", "value": "0" }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://gateway.pinata.cloud/ipfs/YOUR_IMAGE_CID",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

### Step 3: Upload Metadata to Pinata

1. Go to https://app.pinata.cloud/
2. Click **Upload** → **Folder**
3. Select your `cnft-metadata/` folder
4. Copy the **Folder CID** (looks like `bafybei...`)

### Step 4: Run the Mint

```bash
cd ~/working/solana-candy-machine-ui-/candy-machine-v2
node cnft-mint-to-collection.js addresses.txt <FOLDER_CID>
```

**Example:**
```bash
node cnft-mint-to-collection.js addresses.txt bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce
```

### Step 5: Verify Results

- Results saved to `batch-mint-results-verified.json`
- cNFTs appear in Phantom Collectibles within 10-15 minutes

---

## Detailed Instructions

### Creating Metadata Files in Bulk

To create metadata for many NFTs at once:

```bash
cd ~/working/solana-candy-machine-ui-/candy-machine-v2/cnft-metadata

# Create 100 metadata files (0.json through 99.json)
for i in {0..99}; do
cat > ${i}.json << EOF
{
  "name": "Unify NFT #${i}",
  "symbol": "UNIFY",
  "description": "Unify NFT Collection",
  "image": "https://gateway.pinata.cloud/ipfs/bafybeia575s6nzx4pfecxeh3xzdj52uh4rcdz6mtuer5nktgldpjzcqc5q",
  "attributes": [
    { "trait_type": "Edition", "value": "cNFT" },
    { "trait_type": "Number", "value": "${i}" }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://gateway.pinata.cloud/ipfs/bafybeia575s6nzx4pfecxeh3xzdj52uh4rcdz6mtuer5nktgldpjzcqc5q",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
EOF
done
```

### Checking Tree Capacity

To see how many cNFTs you've minted and how many remain:

```bash
# Check tree info
cat ~/working/solana-candy-machine-ui-/candy-machine-v2/cnft-tree-v2.json
```

### Verifying a cNFT Was Minted

Use Helius API to check a cNFT:

```bash
curl -s -X POST 'https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b' \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": "check",
    "method": "getAsset",
    "params": { "id": "CNFT_ASSET_ID_HERE" }
  }'
```

### Checking Wallet for cNFTs

To see all cNFTs owned by a wallet:

```bash
curl -s -X POST 'https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b' \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": "check",
    "method": "getAssetsByOwner",
    "params": {
      "ownerAddress": "WALLET_ADDRESS_HERE",
      "page": 1,
      "limit": 100
    }
  }'
```

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Merkle Tree (one-time) | ~0.2 SOL |
| Collection NFT (one-time) | ~0.02 SOL |
| Per cNFT mint | ~0.00005 SOL |

**Example batch costs:**
| Quantity | Total Cost | USD @ $100/SOL |
|----------|------------|----------------|
| 100 cNFTs | 0.005 SOL | $0.50 |
| 1,000 cNFTs | 0.05 SOL | $5.00 |
| 10,000 cNFTs | 0.5 SOL | $50.00 |

---

## Troubleshooting

### "File not found: addresses.txt"
- Make sure you're in the correct directory
- Check the file exists: `ls -la addresses.txt`

### "Cannot read tree info"
- Ensure `cnft-tree-v2.json` exists in the working directory
- Check file: `cat cnft-tree-v2.json`

### NFTs not appearing in Phantom
- Wait 10-15 minutes for indexing
- Check "Hidden" section in Phantom Collectibles
- Verify collection is verified using Helius API

### Transaction failed
- Check wallet has enough SOL for fees
- Verify recipient address is valid (44 characters)
- Check Solana network status

---

## Important Files

| File | Location | Purpose |
|------|----------|---------|
| Tree Config | `cnft-tree-v2.json` | Merkle tree & collection addresses |
| Mint Script | `cnft-mint-to-collection.js` | Main minting script |
| Addresses | `addresses.txt` | Recipient wallet list |
| Metadata | `cnft-metadata/*.json` | NFT metadata files |
| Results | `batch-mint-results-verified.json` | Mint transaction results |
| Wallet | `~/.config/solana/id.json` | Authority keypair |

---

## Key Technical Details

- Uses `mintToCollectionV1` from Metaplex Bubblegum SDK
- Creates cNFTs with **verified collection** (required for Phantom visibility)
- Metadata hosted on IPFS via Pinata
- RPC: Helius (mainnet)

---

## Backup Reminder

Always keep copies of:
1. `cnft-tree-v2.json` - Tree and collection addresses
2. `~/.config/solana/id.json` - Your wallet keypair
3. `cnft-mint-to-collection.js` - The minting script

These files are backed up in: `candy-machine-v2/backup/`

---

*Last updated: January 13, 2026*
*Collection: Unify Collection*
*Tree capacity remaining: ~16,371 cNFTs*
