import { useWallet } from '@solana/wallet-adapter-react';
import { FC, useCallback, useMemo, useState } from 'react';
import { notify } from "../utils/notifications";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey, some, none } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, findMetadataPda, findMasterEditionPda } from '@metaplex-foundation/mpl-token-metadata';
import { mintToCollectionV1, mplBubblegum, TokenStandard } from '@metaplex-foundation/mpl-bubblegum';
import * as bs58 from 'bs58';

// Configuration - Update these with your values
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=ad915729-b516-4e10-8e2f-57656ff6ee3b';
const COLLECTION_MINT = process.env.NEXT_PUBLIC_CNFT_COLLECTION || 'DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM';
const MERKLE_TREE = process.env.NEXT_PUBLIC_CNFT_MERKLE_TREE || 'E3Do6eop2Bf2vv3nRCdsaE9uqosYyEaAe3zA1MNQNkUG';
const METADATA_BASE_URI = process.env.NEXT_PUBLIC_CNFT_METADATA_URI || 'https://gateway.pinata.cloud/ipfs/bafybeih6h2vabvwciu3kth6jwzrug7sgrnlaidhrxv7wldi44wjpca4tce';

// You'll need to set up a backend API to sign transactions with the collection authority
// For now, this component shows the structure needed

export const CnftMint: FC = () => {
    const wallet = useWallet();
    const [isMinting, setIsMinting] = useState(false);
    const [mintCount, setMintCount] = useState(0);

    const umi = useMemo(
        () =>
            createUmi(RPC_ENDPOINT)
                .use(walletAdapterIdentity(wallet))
                .use(mplTokenMetadata())
                .use(mplBubblegum()),
        [wallet]
    );

    const onClick = useCallback(async () => {
        if (!wallet.publicKey) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            return;
        }

        setIsMinting(true);

        try {
            notify({ type: 'info', message: 'Requesting cNFT mint...' });

            // Call your backend API to mint the cNFT
            // The backend needs the collection authority keypair to sign
            const response = await fetch('/api/mint-cnft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: wallet.publicKey.toBase58(),
                    metadataIndex: mintCount, // Or use a different index strategy
                }),
            });

            const result = await response.json();

            if (result.success) {
                notify({ 
                    type: 'success', 
                    message: 'cNFT Minted!', 
                    description: `Transaction: ${result.signature?.substring(0, 20)}...`
                });
                setMintCount(prev => prev + 1);
            } else {
                throw new Error(result.error || 'Mint failed');
            }

        } catch (error: any) {
            notify({ type: 'error', message: 'Mint failed', description: error?.message });
            console.error('cNFT mint error:', error);
        } finally {
            setIsMinting(false);
        }
    }, [wallet, mintCount]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative group items-center">
                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                    rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <button
                    className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={onClick}
                    disabled={!wallet.publicKey || isMinting}
                >
                    <span>{isMinting ? 'Minting...' : 'Mint cNFT'}</span>
                </button>
            </div>
            <div className="mt-4 text-sm opacity-70">
                <p>Collection: {COLLECTION_MINT.substring(0, 8)}...</p>
                <p>Cost: ~0.00005 SOL (paid by server)</p>
            </div>
        </div>
    );
};

export default CnftMint;
