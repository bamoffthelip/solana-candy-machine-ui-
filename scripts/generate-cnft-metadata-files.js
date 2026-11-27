#!/usr/bin/env node
/**
 * Generate Metaplex-style off-chain metadata JSON files (one per index) for a
 * Pinata *folder* upload. Wallets read these from the URI stored on-chain:
 *   {metadataBaseUri}/{index}.json
 *
 * Usage (from repo root):
 *   node scripts/generate-cnft-metadata-files.js \
 *     --from 13 \
 *     --to 50 \
 *     --image "https://your-cdn.com/unify-promo-art.png" \
 *     --out ./pinata-metadata-upload
 *
 * Video artwork: pass the clip to --image and a still frame to --poster. The
 * clip lands on `animation_url`, the still on `image` (thumbnails), and both
 * are listed under properties.files. Without --poster most wallets show a
 * blank tile. Use --attributes-json to override the default trait list.
 *
 * Image URL: use the same asset as NEXT_PUBLIC_DEFAULT_MINT_MEDIA on Vercel
 * (the Bitcoin graphic), or any https:// or ipfs:// URL wallets can fetch.
 *
 * Pinata steps:
 *   1. Pinata → Files → Upload → Folder (select the output directory).
 *   2. After upload, copy the folder CID (starts with Qm... or bafy...).
 *   3. Set in Vercel (and .env.local):
 *        NEXT_PUBLIC_CNFT_METADATA_URI=https://gateway.pinata.cloud/ipfs/<CID>
 *        CNFT_METADATA_URI=https://gateway.pinata.cloud/ipfs/<CID>
 *      (no trailing slash; each file is /<CID>/13.json etc.)
 *   4. Redeploy. New mints will point at the new folder.
 *
 * IPFS note: an existing CID cannot gain new files. If older mints already
 * reference a CID that is missing 13.json, those on-chain URIs stay wrong until
 * you use a metadata update flow (cNFT / collection policy dependent). This
 * script is for preparing a *complete* folder for the next CID you pin.
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const opts = {
    from: 13,
    to: 50,
    out: "pinata-metadata-upload",
    image: "",
    poster: "",
    attributesJson: "",
    symbol: "UNIFY",
    description: "Unify NFT Collection — community promo cNFT.",
    nameTemplate: "Unify NFT #{index}",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v == null) throw new Error(`Missing value after ${a}`);
      return v;
    };
    if (a === "--from") opts.from = parseInt(next(), 10);
    else if (a === "--to") opts.to = parseInt(next(), 10);
    else if (a === "--out") opts.out = next();
    else if (a === "--image") opts.image = next();
    else if (a === "--poster") opts.poster = next();
    else if (a === "--attributes-json") opts.attributesJson = next();
    else if (a === "--symbol") opts.symbol = next();
    else if (a === "--description") opts.description = next();
    else if (a === "--name-template") opts.nameTemplate = next();
    else if (a === "--help" || a === "-h") {
      console.log(fs.readFileSync(__filename, "utf8").split("/**\n")[1].split("*/")[0]);
      process.exit(0);
    }
  }
  return opts;
}

function formatName(template, index) {
  return template.replace(/\{index\}/g, String(index));
}

function main() {
  const opts = parseArgs(process.argv);
  const image =
    opts.image ||
    process.env.NEXT_PUBLIC_DEFAULT_MINT_MEDIA ||
    process.env.CNFT_PREVIEW_IMAGE_URL ||
    "";

  if (!image) {
    console.error(
      "Missing --image (or set NEXT_PUBLIC_DEFAULT_MINT_MEDIA / CNFT_PREVIEW_IMAGE_URL)."
    );
    process.exit(1);
  }
  if (!Number.isFinite(opts.from) || !Number.isFinite(opts.to) || opts.from < 0 || opts.to < opts.from) {
    console.error("Invalid --from / --to range.");
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), opts.out);
  fs.mkdirSync(outDir, { recursive: true });

  let attributes = [
    { trait_type: "Campaign", value: "Unify Promo" },
    { trait_type: "Tier", value: "Community" },
    { trait_type: "Type", value: "cNFT" },
    { trait_type: "Network", value: "Solana" },
  ];
  if (opts.attributesJson) {
    try {
      attributes = JSON.parse(opts.attributesJson);
    } catch (err) {
      console.error(`--attributes-json is not valid JSON: ${err.message}`);
      process.exit(1);
    }
    if (!Array.isArray(attributes)) {
      console.error("--attributes-json must be a JSON array of {trait_type, value}.");
      process.exit(1);
    }
  }

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(image);
  const fileType = isVideo ? "video/mp4" : "image/png";

  // Wallets and marketplaces use `image` for grid thumbnails, so a video needs a
  // static poster there and the clip itself on `animation_url`.
  const thumbnail = isVideo && opts.poster ? opts.poster : image;
  if (isVideo && !opts.poster) {
    console.warn(
      "WARNING: video artwork without --poster. `image` will point at the video, " +
        "which leaves a blank thumbnail in most wallets and marketplaces."
    );
  }

  let count = 0;
  for (let i = opts.from; i <= opts.to; i++) {
    const name = formatName(opts.nameTemplate, i);
    const files = [{ uri: image, type: fileType }];
    if (isVideo && opts.poster) {
      files.push({ uri: opts.poster, type: "image/png" });
    }
    const doc = {
      name,
      symbol: opts.symbol,
      description: opts.description,
      image: thumbnail,
      attributes,
      properties: {
        category: isVideo ? "video" : "image",
        files,
      },
    };
    if (isVideo) {
      doc.animation_url = image;
    }
    const filePath = path.join(outDir, `${i}.json`);
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), "utf8");
    count++;
  }

  console.log(`Wrote ${count} files to ${outDir}`);
  console.log("Next: upload this folder to Pinata, pin it, set NEXT_PUBLIC_CNFT_METADATA_URI + CNFT_METADATA_URI to the folder gateway URL, redeploy.");
}

main();
