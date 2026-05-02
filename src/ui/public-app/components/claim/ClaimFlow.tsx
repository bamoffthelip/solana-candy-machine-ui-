import { ClaimSuccess } from "./ClaimSuccess";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

type ClaimFlowProps = {
  projectId: string;
};

type ClaimMethod = "wallet" | "crossmint-mpc";

type ClaimResult = {
  success: boolean;
  claimMethod?: ClaimMethod;
  recipient?: string;
  signature?: string;
  metadataIndex?: number;
  assetId?: string; 
  error?: string;
};

export function ClaimFlow({ projectId }: ClaimFlowProps) {
  const wallet = useWallet();
  const [method, setMethod] = useState<ClaimMethod>("wallet");
  const [mpcWalletAddress, setMpcWalletAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<null | {
    mintAddress: string;
    metadataIndex: number;
    imageUrl: string;
  }>(null);
  
  const canClaimWithWallet = Boolean(wallet.publicKey);
  const canClaimWithMpc = mpcWalletAddress.trim().length > 0;

  const submitClaim = async () => {
    setError("");
    setResult(null);
    setIsSubmitting(true);
    try {
      const payload =
        method === "wallet"
          ? { projectId, walletAddress: wallet.publicKey?.toBase58() }
          : { projectId, mpcWalletAddress: mpcWalletAddress.trim() };

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ClaimResult;
      if (!response.ok || !body.success) {
        throw new Error(body.error || "Claim request failed");
      }
      // Fetch metadata for the minted NFT
const metadataResponse = await fetch(
  `/api/public/nft/${body.metadataIndex}?projectId=${projectId}`
);
const metadata = await metadataResponse.json();

// Set success state
setSuccess({
  mintAddress: body.assetId!,  // or body.mintAddress if your API returns it
  metadataIndex: body.metadataIndex!,
  imageUrl: metadata.image || metadata.properties?.image,
});

    } catch (e: any) {
      setError(e?.message || "Unable to complete claim");
    } finally {
      setIsSubmitting(false);
    }
  };
  if (success) {
    return (
      <ClaimSuccess
        mintAddress={success.mintAddress}
        metadataIndex={success.metadataIndex}
        projectId={projectId}
        imageUrl={success.imageUrl}
      />
    );
  }
    return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Claim method</p>
        <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-sm" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${method === "wallet" ? "btn-primary" : "btn-ghost border border-white/20"}`}
          onClick={() => setMethod("wallet")}
        >
          Connected Wallet
        </button>
        <button
          type="button"
          className={`btn btn-sm ${method === "crossmint-mpc" ? "btn-primary" : "btn-ghost border border-white/20"}`}
          onClick={() => setMethod("crossmint-mpc")}
        >
          Crossmint MPC Fallback
        </button>
      </div>

      {method === "wallet" ? (
        <p className="text-xs opacity-75">
          Supports connected wallet claims (Phantom, Solflare, Backpack via wallet adapter).
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs opacity-75">
            Paste Crossmint MPC wallet address to mint directly to custody wallet.
          </p>
          <input
            value={mpcWalletAddress}
            onChange={(e) => setMpcWalletAddress(e.target.value)}
            placeholder="Crossmint MPC wallet address"
            className="input input-bordered w-full bg-black/30"
          />
          <a
            href="https://www.crossmint.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs underline opacity-80"
          >
            Need a Crossmint wallet? Continue on Crossmint
          </a>
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting || (method === "wallet" ? !canClaimWithWallet : !canClaimWithMpc)}
        onClick={submitClaim}
        className="btn btn-primary w-full"
      >
        {isSubmitting ? "Claiming..." : "Claim NFT"}
      </button>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      
    </div>
  );
}
