import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useCallback, useMemo } from 'react';
import { notify } from "../utils/notifications";
import useUserSOLBalanceStore from '../stores/useUserSOLBalanceStore';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, transactionBuilder, publicKey, none } from '@metaplex-foundation/umi';
import { fetchCandyMachine, mint, mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { clusterApiUrl } from '@solana/web3.js';
import * as bs58 from 'bs58';


// Read environment variables (exposed to client via NEXT_PUBLIC_*)
const quicknodeEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
const candyMachineIdEnv = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID;
const treasuryEnv = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
const candyMachineAddress = candyMachineIdEnv ? publicKey(candyMachineIdEnv) : undefined as any;
const treasury = treasuryEnv ? publicKey(treasuryEnv) : undefined as any;
const hasConfig = Boolean(candyMachineIdEnv && treasuryEnv);

export const CandyMint: FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { getUserSOLBalance } = useUserSOLBalanceStore();

    const umi = useMemo(
        () =>
            createUmi(quicknodeEndpoint)
                .use(walletAdapterIdentity(wallet))
                .use(mplCandyMachine())
                .use(mplTokenMetadata()),
        [wallet, quicknodeEndpoint]
    );

    const onClick = useCallback(async () => {
        if (!wallet.publicKey) {
            console.log('error', 'Wallet not connected!');
            notify({ type: 'error', message: 'error', description: 'Wallet not connected!' });
            return;
        }

        if (!hasConfig) {
            notify({ type: 'error', message: 'Missing configuration', description: 'Check NEXT_PUBLIC_CANDY_MACHINE_ID and NEXT_PUBLIC_TREASURY_ADDRESS in .env' });
            return;
        }

        try {
            // Fetch the Candy Machine.
            console.log('Fetching candy machine:', candyMachineAddress);
            const candyMachine = await fetchCandyMachine(
                umi,
                candyMachineAddress,
            );
            console.log('Candy machine fetched:', candyMachine);
            
            // Mint from the Candy Machine.
            const nftMint = generateSigner(umi);
            console.log('Generated NFT mint signer:', nftMint.publicKey);
            console.log('Building transaction...');
            
            const transaction = await transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(
                    mint(umi, {
                        candyMachine: candyMachine.publicKey,
                        nftMint: nftMint.publicKey,
                        collectionMint: candyMachine.collectionMint,
                        collectionUpdateAuthority: candyMachine.authority,
                        nftMintAuthority: umi.identity,
                    })
                );
            console.log('Transaction built, sending...');
            
            const { signature } = await transaction.sendAndConfirm(umi, {
                confirm: { commitment: "confirmed" },
            });
            const txid = bs58.encode(signature);
            console.log('success', `Mint successful! ${txid}`)
            notify({ type: 'success', message: 'Mint successful!', txid });

            getUserSOLBalance(wallet.publicKey, connection);
        } catch (error: any) {
            // Log full error details to console for debugging
            console.error('=== MINT ERROR DETAILS ===');
            console.error('Error object:', error);
            console.error('Error message:', error?.message);
            console.error('Error stack:', error?.stack);
            console.error('Error name:', error?.name);
            console.error('Error cause:', error?.cause);
            console.error('Wallet state:', {
                connected: wallet.connected,
                publicKey: wallet.publicKey?.toBase58(),
                signTransaction: typeof wallet.signTransaction
            });
            console.error('Full error JSON:', JSON.stringify(error, null, 2));
            console.error('=========================');
            
            // Show persistent notification with full error
            const errorMsg = error?.message || error?.toString() || 'Unknown error';
            notify({ 
                type: 'error', 
                message: `Mint failed!`, 
                description: errorMsg
            });
        }
    }, [wallet, connection, getUserSOLBalance, umi, candyMachineAddress, treasury]);
       
     

    return (

        <div className="flex flex-col items-center space-y-4">
                {/* Status banner */}
                <div className="w-full max-w-xl rounded-lg border border-base-300 p-4">
                    <h3 className="text-sm font-semibold mb-2">Candy Machine Config</h3>
                    <div className="text-xs opacity-80">
                        <div><span className="font-mono">RPC</span>: {quicknodeEndpoint}</div>
                        <div><span className="font-mono">CANDY_MACHINE_ID</span>: {candyMachineIdEnv || 'MISSING'}</div>
                        <div><span className="font-mono">TREASURY_ADDRESS</span>: {treasuryEnv || 'MISSING'}</div>
                        <div><span className="font-mono">NETWORK</span>: {process.env.NEXT_PUBLIC_NETWORK || 'devnet'}</div>
                    </div>
                    {!hasConfig && (
                        <div className="mt-2 text-warning text-xs">Set NEXT_PUBLIC_CANDY_MACHINE_ID and NEXT_PUBLIC_TREASURY_ADDRESS in .env</div>
                    )}
                </div>

                {/* Mint button */}
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                    rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
                        <button
                            className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={onClick}
                            disabled={!hasConfig || !wallet.publicKey}
                            >
                                <span>{!wallet.publicKey ? 'Connect Wallet' : 'Mint NFT'}</span>
                
                        </button>
                </div>
        </div>

        
    );
};

