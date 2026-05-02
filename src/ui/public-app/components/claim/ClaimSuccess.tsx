import { useEffect } from "react";
import confetti from "canvas-confetti";

type ClaimSuccessProps = {
  mintAddress: string;
  metadataIndex: number;
  projectId: string;
  imageUrl: string; // resolved from metadata
};

export function ClaimSuccess({
  mintAddress,
  metadataIndex,
  projectId,
  imageUrl,
}: ClaimSuccessProps) {
  useEffect(() => {
    // Subtle confetti burst
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#d946ef", "#a855f7"],
    });
  }, []);

  const solscanUrl = `https://solscan.io/token/${mintAddress}`;
  const metadataUrl = `/public/nft/metadata/${metadataIndex}?projectId=${projectId}`;

  return (
    <div className="w-full max-w-xl mx-auto text-center mt-10">
      <h2 className="text-3xl font-bold bg-gradient-to-br from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
        🎉 NFT Claimed Successfully
      </h2>

      <p className="mt-2 text-sm opacity-75">
        Your Unify Genesis Promo cNFT has been minted and is now yours.
      </p>

      <div className="mt-6">
        <img
          src={imageUrl}
          alt="Minted NFT"
          className="w-full rounded-xl shadow-lg border border-white/10"
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <a
          href={solscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          View on Solscan
        </a>

        <a
          href={metadataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition"
        >
          View Metadata
        </a>

        {/* Placeholder for Step 3 */}
        <div className="mt-4">
          <div className="opacity-60 text-sm">Share component coming next…</div>
        </div>

        <a
          href={`/claim/${projectId}`}
          className="mt-4 text-sm opacity-70 hover:opacity-100 transition"
        >
          Claim another campaign
        </a>
      </div>
    </div>
  );
}
