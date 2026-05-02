import { getAssetIdFromLeaf } from "@metaplex-foundation/mpl-bubblegum";
import type { NextApiRequest, NextApiResponse } from "next";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey, some, none, Signer } from "@metaplex-foundation/umi";
import { mplTokenMetadata, findMetadataPda, findMasterEditionPda } from "@metaplex-foundation/mpl-token-metadata";
import {
  mintToCollectionV1,
  mplBubblegum,
  TokenStandard,
  MetadataArgsArgs,
} from "@metaplex-foundation/mpl-bubblegum";
import bs58 from "bs58";
import { formatNftName, getProjectConfigOrFallback } from "../../../lib/project-config";
import { nextMetadataIndex } from "../../../lib/mint-index";

const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const DEFAULT_COLLECTION_MINT =
  process.env.CNFT_COLLECTION || "DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM";
const DEFAULT_MERKLE_TREE =
  process.env.CNFT_MERKLE_TREE || "E3Do6eop2Bf2vv3nRCdsaE9uqosYyEaAe3zA1MNQNkUG";
const AUTHORITY_SECRET_KEY = process.env.CNFT_AUTHORITY_SECRET_KEY;

type ClaimMethod = "wallet" | "crossmint-mpc";

type ResponseData = {
  success: boolean;
  claimMethod?: ClaimMethod;
  recipient?: string;
  signature?: string;
  metadataIndex?: number;
  projectId?: string;
  assetId?: string;   // ⭐ added
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const {
    projectId: rawProjectId,
    metadataIndex: bodyMetadataIndex,
    walletAddress,
    mpcWalletAddress,
  } = req.body || {};

  const projectId = typeof rawProjectId === "string" && rawProjectId.length > 0 ? rawProjectId : "unify";
  const recipient = walletAddress || mpcWalletAddress;
  const claimMethod: ClaimMethod = walletAddress ? "wallet" : "crossmint-mpc";

  if (!recipient || typeof recipient !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing recipient. Provide walletAddress or mpcWalletAddress.",
    });
  }

  if (!AUTHORITY_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      error: "Server not configured: Missing CNFT_AUTHORITY_SECRET_KEY",
    });
  }

  try {
    let recipientPubkey;
    try {
      recipientPubkey = publicKey(recipient);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid recipient address" });
    }

    const project = getProjectConfigOrFallback(projectId);
    let mintIndex: number;
    if (typeof bodyMetadataIndex === "number" && Number.isFinite(bodyMetadataIndex) && bodyMetadataIndex >= 0) {
      mintIndex = Math.floor(bodyMetadataIndex);
    } else {
      mintIndex = nextMetadataIndex(projectId, project.defaultStartMetadataIndex);
    }

    const baseUri = project.metadataBaseUri.replace(/\/$/, "");
    const metadataUri = `${baseUri}/${mintIndex}.json`;
    const nftName = formatNftName(project.nftNameTemplate, mintIndex);

    const umi = createUmi(RPC_ENDPOINT).use(mplTokenMetadata()).use(mplBubblegum());
    const secretKeyBytes = bs58.decode(AUTHORITY_SECRET_KEY);
    const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
    umi.use(keypairIdentity(authorityKeypair));

    const collectionMint = publicKey(project.collectionMint || DEFAULT_COLLECTION_MINT);
    const merkleTree = publicKey(project.merkleTree || DEFAULT_MERKLE_TREE);  // ⭐ moved above assetId

    // ⭐ assetId must be computed AFTER merkleTree is defined
    const assetId = getAssetIdFromLeaf(merkleTree, mintIndex);

    const collectionMetadata = findMetadataPda(umi, { mint: collectionMint });
    const collectionEdition = findMasterEditionPda(umi, { mint: collectionMint });

    const metadata: MetadataArgsArgs = {
      name: nftName,
      symbol: project.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      collection: {
        key: collectionMint,
        verified: false,
      },
      creators: [
        {
          address: authorityKeypair.publicKey,
          verified: false,
          share: 100,
        },
      ],
      primarySaleHappened: false,
      isMutable: true,
      editionNonce: none<number>(),
      tokenStandard: some(TokenStandard.NonFungible),
      uses: none(),
      tokenProgramVersion: 0,
    };

    const tx = await mintToCollectionV1(umi, {
      leafOwner: recipientPubkey,
      merkleTree,
      collectionMint,
      collectionMetadata,
      collectionEdition,
      collectionAuthority: umi.identity as Signer,
      metadata,
    });

    const result = await tx.sendAndConfirm(umi);
    const signature = bs58.encode(result.signature);

    return res.status(200).json({
      success: true,
      claimMethod,
      recipient,
      signature,
      metadataIndex: mintIndex,
      projectId,
      assetId: assetId.toString(),   // ⭐ added
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Unknown claim error occurred",
    });
  }
}
