#!/bin/bash

# Batch airdrop script for Unify NFT Collection
# Candy Machine: 3z9vLWuLB2hLu7LAa4ig8L75GbFCbREH2MwCms6iynpi

echo "Starting batch airdrop of 14 NFTs..."
echo "Candy Machine: 3z9vLWuLB2hLu7LAa4ig8L75GbFCbREH2MwCms6iynpi"
echo ""

count=0
success=0
failed=0

while IFS= read -r address; do
  # Skip empty lines
  [[ -z "$address" ]] && continue
  
  count=$((count + 1))
  echo "[$count/14] Minting to: $address"
  
  if ~/bin/sugar mint --receiver "$address"; then
    success=$((success + 1))
    echo "✅ Success!"
  else
    failed=$((failed + 1))
    echo "❌ Failed!"
  fi
  
  echo ""
  sleep 2  # Brief pause between mints
done < addresses.txt

echo "========================================="
echo "Airdrop complete!"
echo "Successful: $success"
echo "Failed: $failed"
echo "========================================="
