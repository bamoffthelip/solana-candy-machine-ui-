import { FC } from "react";

type MintSuccessProps = {
  title: string;
  mediaUrl: string;
  signature: string;
  assetId?: string;
  /** Metadata JSON index used in URI (e.g. .../ipfs/CID/12.json). */
  metadataIndex?: number;
};

export const MintSuccess: FC<MintSuccessProps> = ({
  title,
  mediaUrl,
  signature,
  assetId,
  metadataIndex,
}) => {
  const mintReference = assetId || signature;
  const solscanUrl = `https://solscan.io/tx/${signature}`;

  const onShare = async () => {
    const shareText = `I just minted ${title} on Solana. ${solscanUrl}`;
    if (navigator.share) {
      await navigator.share({ title, text: shareText, url: solscanUrl });
      return;
    }
    await navigator.clipboard.writeText(shareText);
  };

  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
      <h3 className="mb-3 text-lg font-semibold text-emerald-300">Mint successful</h3>
      <img src={mediaUrl} alt={title} className="mb-3 h-48 w-full rounded-lg object-cover" />

      {typeof metadataIndex === "number" ? (
        <>
          <p className="text-sm opacity-80">Metadata index</p>
          <p className="mb-2 font-mono text-xs">{metadataIndex}</p>
        </>
      ) : null}
      <p className="text-sm opacity-80">Transaction / reference</p>
      <p className="break-all text-xs">{mintReference}</p>

      <div className="mt-3 flex gap-2">
        <a
          className="btn btn-sm border border-white/20 bg-black/30"
          href={solscanUrl}
          target="_blank"
          rel="noreferrer"
        >
          View on Solscan
        </a>
        <button className="btn btn-sm bg-white/90 text-black hover:bg-white" onClick={onShare}>
          Share
        </button>
      </div>
    </div>
  );
};

