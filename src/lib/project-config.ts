/**
 * Per-project mint settings for Unify cNFT flows (mint UI + airdrop).
 * Chain defaults (RPC, authority key) stay in env; project-specific URIs and display live here.
 */

export type ProjectAttribute = { trait_type: string; value: string };

export type ProjectMintConfig = {
  /** URL segment, e.g. /mint/unify */
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType?: "image" | "video";
  attributes: ProjectAttribute[];
  /** Base URI for metadata JSON folder (trailing slash optional; we append /{index}.json). */
  metadataBaseUri: string;
  /** NFT name on-chain; {index} is replaced with the metadata index. */
  nftNameTemplate: string;
  symbol: string;
  /** Optional: override env CNFT_COLLECTION for this project. */
  collectionMint?: string;
  /** Optional: override env CNFT_MERKLE_TREE for this project. */
  merkleTree?: string;
  /** First index to use for metadata filenames when server assigns the next index (env can override). */
  defaultStartMetadataIndex: number;
};

const DEFAULT_MEDIA =
  process.env.NEXT_PUBLIC_DEFAULT_MINT_MEDIA ||
  "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1400&q=80";

const DEFAULT_METADATA_BASE =
  process.env.NEXT_PUBLIC_CNFT_METADATA_URI ||
  process.env.CNFT_METADATA_URI ||
  "https://gateway.pinata.cloud/ipfs/bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce";

export const PROJECTS: Record<string, ProjectMintConfig> = {
  unify: {
    id: "unify",
    title: "Unify Promo cNFT",
    description:
      "A compressed NFT for community campaigns, event rewards, and promotional engagement.",
    mediaUrl: DEFAULT_MEDIA,
    attributes: [
      { trait_type: "Campaign", value: "Unify Promo" },
      { trait_type: "Tier", value: "Community" },
      { trait_type: "Type", value: "cNFT" },
      { trait_type: "Network", value: "Solana" },
    ],
    metadataBaseUri: DEFAULT_METADATA_BASE,
    nftNameTemplate: "Unify NFT #{index}",
    symbol: "UNIFY",
    defaultStartMetadataIndex: 13,
  },
  demo: {
    id: "demo",
    title: "Demo Campaign cNFT",
    description: "Example second project: swap media, attributes, and metadata base for another drop.",
    mediaUrl: DEFAULT_MEDIA,
    attributes: [
      { trait_type: "Campaign", value: "Demo" },
      { trait_type: "Type", value: "cNFT" },
    ],
    metadataBaseUri: DEFAULT_METADATA_BASE,
    nftNameTemplate: "Demo Promo #{index}",
    symbol: "DEMO",
    defaultStartMetadataIndex: 0,
  },
};

export function listProjectIds(): string[] {
  return Object.keys(PROJECTS);
}

export function getProjectConfig(projectId: string): ProjectMintConfig | undefined {
  return PROJECTS[projectId];
}

/** Fallback when an unknown id is used (still mints with shared env chain settings). */
export function getProjectConfigOrFallback(projectId: string): ProjectMintConfig {
  const existing = PROJECTS[projectId];
  if (existing) return existing;
  return {
    id: projectId,
    title: `Unify ${projectId} cNFT`,
    description:
      "Compressed promotional NFT. Add this id to src/lib/project-config.ts for full branding.",
    mediaUrl: DEFAULT_MEDIA,
    attributes: [
      { trait_type: "Project", value: projectId },
      { trait_type: "Type", value: "cNFT" },
    ],
    metadataBaseUri: DEFAULT_METADATA_BASE,
    nftNameTemplate: `Unify ${projectId} #{index}`,
    symbol: "UNIFY",
    defaultStartMetadataIndex: 0,
  };
}

export function formatNftName(template: string, index: number): string {
  return template.replace(/\{index\}/g, String(index));
}
