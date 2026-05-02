#!/bin/bash

# Batch deployment script - 7 candy machines with 2 items each

addresses=(
  "A2CWFF2jNig2SEJQCDmVVAQKnWj6DdsRPAgdYDjx29FA"
  "2yisnFF7oppGpoKzEUdea9mbL8brbjjNdt2dYmuEjULP"
  "73ATS1gRpUyjeKC9gNTevVgHFmivp9C4ERVApdzDqsZB"
  "2YntdszHWMTgP414mzb9ae6qDnicU4cbGjbDza8yz85V"
  "2o51K6oNKu6BC2nsX25dsVRPAmq6TgJjWaVohdrHpbkV"
  "GenNjD5cDpXwwCPPC9spPTBmTXaW9tLSrAaRQEh9b3aW"
  "Fz8XejQqhTdmuovGmdT92wtVj3LET5HeTS5Y1rNBrByo"
  "3dmGpFAPtbLMxsw4gKEGgErakXHwUdbFZqExknprez49"
  "7C3Ry3AZjJyGHnDaFeCy37VacBCBjjxGGTNyJRyDBNr1"
  "8sFkvrxuURdF9C5STMRrxYrstGaYnLBK5T3uxenKwykU"
  "BesAgSUmJFWHnD4PBQTYhMCdBS4J6SgzxDdtWuywzrXS"
  "DTwGZZSoXLYzgexDY8Cb9MKJ2tMsa1GcSqSpUgNgmjFH"
  "DFsR4Ex82qD77K2JRAr8xp6SK4th6ghuB8aU4nAgh4kZ"
  "24wq9d6BykDwadbf9ihi2BeZuXmxvUzAtSVGdndhKKLV"
)

total_success=0
total_failed=0

for batch in {0..6}; do
  start_idx=$((batch * 2))
  end_idx=$((start_idx + 1))
  
  echo "========================================"
  echo "BATCH $((batch + 1))/7: Assets $start_idx-$end_idx"
  echo "========================================"
  
  # Keep only the assets for this batch
  mkdir -p /tmp/candy-assets-backup
  mv assets/*.{json,png} /tmp/candy-assets-backup/ 2>/dev/null
  
  # Restore collection and this batch's assets
  cp /tmp/candy-assets-backup/collection.* assets/
  cp /tmp/candy-assets-backup/${start_idx}.* assets/
  cp /tmp/candy-assets-backup/${end_idx}.* assets/
  
  # Clean and deploy
  rm -f cache.json
  
  echo "Uploading assets..."
  if ! ~/bin/sugar upload; then
    echo "❌ Upload failed for batch $((batch + 1))"
    mv /tmp/candy-assets-backup/* assets/
    rmdir /tmp/candy-assets-backup
    continue
  fi
  
  echo "Deploying candy machine..."
  if ! ~/bin/sugar deploy; then
    echo "❌ Deploy failed for batch $((batch + 1))"
    mv /tmp/candy-assets-backup/* assets/
    rmdir /tmp/candy-assets-backup
    continue
  fi
  
  echo "Minting 2 NFTs..."
  
  # Mint to first address
  addr1_idx=$((start_idx))
  if [ $addr1_idx -lt ${#addresses[@]} ]; then
    echo "Minting to ${addresses[$addr1_idx]}..."
    if ~/bin/sugar mint --receiver "${addresses[$addr1_idx]}"; then
      echo "✅ Mint 1 success"
      ((total_success++))
    else
      echo "❌ Mint 1 failed"
      ((total_failed++))
    fi
    sleep 2
  fi
  
  # Mint to second address
  addr2_idx=$((end_idx))
  if [ $addr2_idx -lt ${#addresses[@]} ]; then
    echo "Minting to ${addresses[$addr2_idx]}..."
    if ~/bin/sugar mint --receiver "${addresses[$addr2_idx]}"; then
      echo "✅ Mint 2 success"
      ((total_success++))
    else
      echo "❌ Mint 2 failed"
      ((total_failed++))
    fi
    sleep 2
  fi
  
  # Restore all assets for next iteration
  mv /tmp/candy-assets-backup/* assets/
  rmdir /tmp/candy-assets-backup
  
  echo ""
done

echo "========================================"
echo "ALL BATCHES COMPLETE!"
echo "Total Successful: $total_success"
echo "Total Failed: $total_failed"
echo "========================================"
