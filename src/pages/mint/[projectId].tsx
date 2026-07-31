import type { NextPage } from "next";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState } from "react";
import { getProjectConfigOrFallback } from "../../lib/project-config";
import { CROSSMINT_WALLET_HELP_URL } from "../../lib/crossmint-links";
import { MintButton } from "../../ui/public-app/components/mint/MintButton";
import { MintPreview } from "../../ui/public-app/components/mint/MintPreview";
import { MintProgress, MintStage } from "../../ui/public-app/components/mint/MintProgress";
import { MintSuccess } from "../../ui/public-app/components/mint/MintSuccess";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MintProjectPage: NextPage = () => {
  const router = useRouter();
  const wallet = useWallet();

  const projectId =
    typeof router.query.projectId === "string" ? router.query.projectId : "unify";
  const project = useMemo(() => getProjectConfigOrFallback(projectId), [projectId]);

  const [stage, setStage] = useState<MintStage>("idle");
  const [error, setError] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [assetId, setAssetId] = useState<string>("");
  const [metadataIndex, setMetadataIndex] = useState<number | null>(null);

  const mintCnfT = async () => {
    if (!wallet.publicKey) {
      setError("Connect a Solana wallet first.");
      setStage("error");
      return;
    }

    setError("");
    setSignature("");
    setAssetId("");
    setMetadataIndex(null);

    try {
      setStage("preparing");
      await wait(350);
      setStage("uploading");
      await wait(350);
      setStage("minting");

      const response = await fetch("/api/mint-cnft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: wallet.publicKey.toBase58(),
          projectId,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Mint request failed");
      }

      setStage("finalizing");
      await wait(500);
      setSignature(result.signature);
      setAssetId(result.assetId || "");
      if (typeof result.metadataIndex === "number") {
        setMetadataIndex(result.metadataIndex);
      }
      setStage("success");
    } catch (e: any) {
      setError(e?.message || "Unknown mint error");
      setStage("error");
    }
  };

  return (
    <>
      <Head>
        <title>{project.title} | Mint</title>
        <meta name="description" content={project.description} />
      </Head>

      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            Mint cNFT
          </h1>
          <p className="mt-2 text-sm opacity-75">
            Use Solana wallet or Crossmint checkout for promotional/community cNFT campaigns.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <MintPreview
            title={project.title}
            description={project.description}
            mediaUrl={project.mediaUrl}
            mediaType={project.mediaType}
            attributes={project.attributes}
          />

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold">Connect wallet</p>
              <p className="mb-3 mt-1 text-xs opacity-70">
                Primary: Solana wallet. Secondary: Crossmint checkout flow.
              </p>
              <div className="flex flex-wrap gap-2">
                <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-sm" />
                <a
                  href={CROSSMINT_WALLET_HELP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm border border-white/20 bg-black/30"
                >
                  Continue with Crossmint
                </a>
              </div>
            </div>

            <MintButton stage={stage} disabled={!wallet.publicKey} onMint={mintCnfT} />
            <MintProgress stage={stage} />

            {stage === "error" && error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {stage === "success" && signature ? (
              <MintSuccess
                title={project.title}
                mediaUrl={project.mediaUrl}
                signature={signature}
                assetId={assetId}
                metadataIndex={metadataIndex ?? undefined}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default MintProjectPage;

