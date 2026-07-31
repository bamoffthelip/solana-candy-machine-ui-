import { ClaimSuccess } from "./ClaimSuccess";
import { TurnstileWidget } from "./TurnstileWidget";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import { getProjectConfigOrFallback } from "../../../../lib/project-config";
import { CROSSMINT_WALLET_HELP_URL } from "../../../../lib/crossmint-links";
import { useCrossmintEmbedded } from "../../../shared/contexts/crossmint-embedded-context";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

const CROSSMINT_CLIENT_KEY = (
  process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY ||
  process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ||
  ""
).trim();

function CrossmintMpcSectionLoadError() {
  return (
    <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-[11px] leading-snug text-red-200/90">
      Embedded Crossmint UI failed to load in the browser. Try disabling extensions/ad blockers, check the
      Network tab for blocked scripts, and confirm Content-Security-Policy allows Crossmint. You can still
      paste a recipient address below.
    </div>
  );
}

const CrossmintMpcSectionDynamic = dynamic(
  () =>
    import("./CrossmintMpcSection")
      .then((m) => m.CrossmintMpcSection)
      .catch(() => CrossmintMpcSectionLoadError),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
        <p className="text-xs font-medium text-white/90">Crossmint embedded wallet</p>
        <p className="text-[11px] opacity-70">Loading sign-in…</p>
      </div>
    ),
  }
);

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
  const { embeddedWalletReady, crossmintModuleError } = useCrossmintEmbedded();
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
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);
  const onCrossmintRecipientAddress = useCallback((addr: string) => {
    setMpcWalletAddress(addr);
  }, []);

  const turnstileRequired = Boolean(TURNSTILE_SITE_KEY);
  const turnstileReady = !turnstileRequired || turnstileToken.length > 0;

  const canClaimWithWallet = Boolean(wallet.publicKey) && turnstileReady;
  const canClaimWithMpc = mpcWalletAddress.trim().length > 0 && turnstileReady;

  const submitClaim = async () => {
    setError("");
    setResult(null);
    setIsSubmitting(true);
    try {
      const base =
        method === "wallet"
          ? { projectId, walletAddress: wallet.publicKey?.toBase58() }
          : { projectId, mpcWalletAddress: mpcWalletAddress.trim() };
      const payload = turnstileToken ? { ...base, turnstileToken } : base;

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ClaimResult;
      if (!response.ok || !body.success) {
        throw new Error(body.error || "Claim request failed");
      }

      const projectCfg = getProjectConfigOrFallback(projectId);
      let imageUrl = projectCfg.mediaUrl;
      try {
        const metadataResponse = await fetch(
          `/api/public/nft/${body.metadataIndex}?projectId=${encodeURIComponent(projectId)}`
        );
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          if (metadata && typeof metadata === "object" && !("error" in metadata)) {
            const m = metadata as { image?: string; properties?: { image?: string } };
            imageUrl = m.image || m.properties?.image || imageUrl;
          }
        }
      } catch {
        /* keep projectCfg.mediaUrl */
      }

      setSuccess({
        mintAddress: body.assetId!,
        metadataIndex: body.metadataIndex!,
        imageUrl,
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
            Use an embedded Crossmint Solana wallet (below) or paste any valid Solana recipient address
            (including a Crossmint MPC address from the Crossmint console).
          </p>
          {!CROSSMINT_CLIENT_KEY ? (
            <p className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] leading-snug text-amber-100/90">
              Set <span className="font-mono">NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY</span> (or{" "}
              <span className="font-mono">NEXT_PUBLIC_CROSSMINT_API_KEY</span>) on the server build,
              redeploy, and allow your site origin in the Crossmint console. Then sign-in will appear
              here.
            </p>
          ) : crossmintModuleError ? (
            <div className="rounded-md border border-red-500/25 bg-red-500/10 p-2 text-[11px] leading-snug text-red-200/90">
              Crossmint SDK did not load: {crossmintModuleError}. Check your connection, ad blockers, and
              CSP; then hard-refresh. You can still paste a Solana recipient address below.
            </div>
          ) : !embeddedWalletReady ? (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-xs font-medium text-white/90">Crossmint embedded wallet</p>
              <p className="text-[11px] opacity-70">Loading Crossmint…</p>
            </div>
          ) : (
            <CrossmintMpcSectionDynamic onRecipientAddress={onCrossmintRecipientAddress} />
          )}
          <input
            value={mpcWalletAddress}
            onChange={(e) => setMpcWalletAddress(e.target.value)}
            placeholder="Solana / Crossmint MPC wallet address (manual fallback)"
            className="input input-bordered w-full bg-black/30"
          />
          <a
            href={CROSSMINT_WALLET_HELP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline opacity-80"
          >
            Need a Crossmint wallet? Continue here
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

      <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={onTurnstileToken} />
      {turnstileRequired && !turnstileReady ? (
        <p className="text-xs opacity-70">Verifying you&apos;re human…</p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}

