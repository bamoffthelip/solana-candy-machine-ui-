import type { NextApiRequest, NextApiResponse } from 'next';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey, some, none } from '@metaplex-foundation/umi';
import { mplTokenMetadata, findMetadataPda, findMasterEditionPda } from '@metaplex-foundation/mpl-token-metadata';
import { mintToCollectionV1, mplBubblegum, TokenStandard } from '@metaplex-foundation/mpl-bubblegum';
import * as bs58 from 'bs58';

// Configuration
const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b';
const COLLECTION_MINT = process.env.CNFT_COLLECTION || 'DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM';
const MERKLE_TREE = process.env.CNFT_MERKLE_TREE || 'E3Do6eop2Bf2vv3nRCdsaE9uqosYyEaAe3zA1MNQNkUG';
const METADATA_BASE_URI = process.env.CNFT_METADATA_URI || 'https://gateway.pinata.cloud/ipfs/bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce';

// IMPORTANT: Store this securely! Use environment variable in production
// This is the collection authority keypair (base58 encoded secret key)
const AUTHORITY_SECRET_KEY = process.env.CNFT_AUTHORITY_SECRET_KEY;

// Track mint count (in production, use a database)
let globalMintIndex = 13; // Start after existing mints

type ResponseData = {
  success: boolean;
  signature?: string;
  assetId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { recipient, metadataIndex } = req.body;

  if (!recipient) {
    return res.status(400).json({ success: false, error: 'Missing recipient address' });
  }

  if (!AUTHORITY_SECRET_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Server not configured: Missing CNFT_AUTHORITY_SECRET_KEY' 
    });
  }

  try {
    // Validate recipient address
    let recipientPubkey;
    try {
      recipientPubkey = publicKey(recipient);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid recipient address' });
    }

    // Setup UMI with authority keypair
    const umi = createUmi(RPC_ENDPOINT)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    // Decode authority keypair from base58
    const secretKeyBytes = bs58.decode(AUTHORITY_SECRET_KEY);
    const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
    umi.use(keypairIdentity(authorityKeypair));

    const collectionMint = publicKey(COLLECTION_MINT);
    const collectionMetadata = findMetadataPda(umi, { mint: collectionMint });
    const collectionEdition = findMasterEditionPda(umi, { mint: collectionMint });

    // Determine mint index
    const mintIndex = metadataIndex ?? globalMintIndex++;
    const metadataUri = `${METADATA_BASE_URI}/${mintIndex}.json`;

    // Build metadata
    const metadata = {
      name: `Unify NFT #${mintIndex}`,
      symbol: 'UNIFY',
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      collection: {
        key: collectionMint,
        verified: false, // Will be verified by instruction
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
      editionNonce: none(),
      tokenStandard: some(TokenStandard.NonFungible),
      uses: none(),
      tokenProgramVersion: 0,
    };

    // Mint the cNFT
    const tx = await mintToCollectionV1(umi, {
      leafOwner: recipientPubkey,
      merkleTree: publicKey(MERKLE_TREE),
      collectionMint: collectionMint,
      collectionMetadata: collectionMetadata,
      collectionEdition: collectionEdition,
      collectionAuthority: authorityKeypair,
      metadata: metadata,
    });

    const result = await tx.sendAndConfirm(umi);
    const signature = bs58.encode(result.signature);

    console.log(`cNFT minted to ${recipient}, signature: ${signature}`);

    return res.status(200).json({
      success: true,
      signature: signature,
    });

  } catch (error: any) {
    console.error('Mint error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error occurred',
    });
  }
}
