import type { NextApiRequest, NextApiResponse } from 'next';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey, some, none, Signer } from '@metaplex-foundation/umi';
import { mplTokenMetadata, findMetadataPda, findMasterEditionPda } from '@metaplex-foundation/mpl-token-metadata';
import {
  mintToCollectionV1,
  mplBubblegum,
  parseLeafFromMintToCollectionV1Transaction,
  TokenStandard,
  MetadataArgsArgs,
  type LeafSchema,
} from '@metaplex-foundation/mpl-bubblegum';
import bs58 from 'bs58';
import { formatNftName, getProjectConfigOrFallback } from '../../../lib/project-config';
import { releaseReservation, reserveClaim } from '../../../lib/claim-store';

const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEFAULT_COLLECTION_MINT = process.env.CNFT_COLLECTION || 'DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM';
const DEFAULT_MERKLE_TREE = process.env.CNFT_MERKLE_TREE || 'E3Do6eop2Bf2vv3nRCdsaE9uqosYyEaAe3zA1MNQNkUG';

const AUTHORITY_SECRET_KEY = process.env.CNFT_AUTHORITY_SECRET_KEY;

async function resolveMintedAssetId(
  umi: Parameters<typeof parseLeafFromMintToCollectionV1Transaction>[0],
  signature: Uint8Array
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const leaf: LeafSchema = await parseLeafFromMintToCollectionV1Transaction(umi, signature);
      return leaf.id.toString();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not parse leaf / asset id from mint transaction');
}

type ResponseData = {
  success: boolean;
  signature?: string;
  metadataIndex?: number;
  assetId?: string;
  projectId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { recipient, projectId: rawProjectId, metadataIndex: bodyMetadataIndex } = req.body || {};
  const projectId = typeof rawProjectId === 'string' && rawProjectId.length > 0 ? rawProjectId : 'unify';

  if (!recipient) {
    return res.status(400).json({ success: false, error: 'Missing recipient address' });
  }

  if (!AUTHORITY_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Server not configured: Missing CNFT_AUTHORITY_SECRET_KEY',
    });
  }

  try {
    let recipientPubkey;
    try {
      recipientPubkey = publicKey(recipient);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid recipient address' });
    }

    const project = getProjectConfigOrFallback(projectId);

    let mintIndex: number;
    let reservedSlot = false;
    if (typeof bodyMetadataIndex === 'number' && Number.isFinite(bodyMetadataIndex) && bodyMetadataIndex >= 0) {
      mintIndex = Math.floor(bodyMetadataIndex);
    } else {
      const { metadataIndex } = await reserveClaim(projectId, recipient, project.defaultStartMetadataIndex);
      mintIndex = metadataIndex;
      reservedSlot = true;
    }

    const baseUri = project.metadataBaseUri.replace(/\/$/, '');
    const metadataUri = `${baseUri}/${mintIndex}.json`;
    const nftName = formatNftName(project.nftNameTemplate, mintIndex);

    const umi = createUmi(RPC_ENDPOINT)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    const secretKeyBytes = bs58.decode(AUTHORITY_SECRET_KEY);
    const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
    umi.use(keypairIdentity(authorityKeypair));

    const collectionMint = publicKey(project.collectionMint || DEFAULT_COLLECTION_MINT);
    const merkleTree = publicKey(project.merkleTree || DEFAULT_MERKLE_TREE);
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

    try {
      const tx = await mintToCollectionV1(umi, {
        leafOwner: recipientPubkey,
        merkleTree,
        collectionMint,
        collectionMetadata,
        collectionEdition,
        collectionAuthority: umi.identity as Signer,
        metadata,
      });

      const result = await tx.sendAndConfirm(umi, {
        confirm: { commitment: 'finalized' },
      });
      const signature = bs58.encode(result.signature);
      const assetId = await resolveMintedAssetId(umi, result.signature);

      console.log(`cNFT minted project=${projectId} index=${mintIndex} to ${recipient}, sig=${signature}, assetId=${assetId}`);

      return res.status(200).json({
        success: true,
        signature,
        metadataIndex: mintIndex,
        projectId,
        assetId,
      });
    } catch (mintError) {
      if (reservedSlot) {
        await releaseReservation(projectId, recipient).catch(() => undefined);
      }
      throw mintError;
    }
  } catch (error: any) {
    const msg = error?.message || 'Unknown error occurred';
    if (typeof msg === 'string' && msg.includes('already claimed')) {
      return res.status(400).json({ success: false, error: msg });
    }
    console.error('Mint error:', error);
    return res.status(500).json({
      success: false,
      error: msg,
    });
  }
}
