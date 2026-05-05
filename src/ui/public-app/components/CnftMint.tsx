import { useWallet } from "@solana/wallet-adapter-react";
import { FC, useCallback, useState } from "react";
import { notify } from "../../../utils/notifications";

const COLLECTION_MINT =
  process.env.NEXT_PUBLIC_CNFT_COLLECTION || "DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM";

/** Legacy /cnft page — uses server mint with project `unify` (see src/lib/project-config.ts). */
export const CnftMint: FC = () => {
  const wallet = useWallet();
  const [isMinting, setIsMinting] = useState(false);

  const onClick = useCallback(async () => {
    if (!wallet.publicKey) {
      notify({ type: "error", message: "Wallet not connected!" });
      return;
    }

    setIsMinting(true);

    try {
      notify({ type: "info", message: "Requesting cNFT mint..." });

      const response = await fetch("/api/mint-cnft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: wallet.publicKey.toBase58(),
          projectId: "unify",
        }),
      });

      const result = await response.json();

      if (result.success) {
        notify({
          type: "success",
          message: "cNFT Minted!",
          description: `Transaction: ${result.signature?.substring(0, 20)}...`,
        });
      } else {
        throw new Error(result.error || "Mint failed");
      }
    } catch (error: any) {
      notify({ type: "error", message: "Mint failed", description: error?.message });
      console.error("cNFT mint error:", error);
    } finally {
      setIsMinting(false);
    }
  }, [wallet]);

  return (
    <div className="flex flex-col items-center">
      <div className="group relative items-center">
        <div
          className="m-1 absolute -inset-0.5 animate-tilt rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-20 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"
        />
        <button
          className="btn m-2 animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 px-8 text-black hover:from-white hover:to-purple-300"
          onClick={onClick}
          disabled={!wallet.publicKey || isMinting}
        >
          <span>{isMinting ? "Minting..." : "Mint cNFT"}</span>
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
