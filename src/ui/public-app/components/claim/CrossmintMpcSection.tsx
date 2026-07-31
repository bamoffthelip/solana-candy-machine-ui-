import { useEffect } from "react";
import {
  useCrossmintAuth,
  useWallet as useCrossmintWallet,
} from "@crossmint/client-sdk-react-ui";

type CrossmintMpcSectionProps = {
  onRecipientAddress: (address: string) => void;
};

/**
 * Opens Crossmint auth via `login()` (modal with email/Google). After success, `createOnLogin`
 * provisions a Solana wallet; address is forwarded for `/api/claim` as `mpcWalletAddress`.
 */
export function CrossmintMpcSection({ onRecipientAddress }: CrossmintMpcSectionProps) {
  const { wallet, status: walletStatus } = useCrossmintWallet();
  const auth = useCrossmintAuth();

  useEffect(() => {
    onRecipientAddress(wallet?.address ?? "");
  }, [wallet?.address, onRecipientAddress]);

  const authBusy =
    auth.status === "initializing" || auth.status === "in-progress";

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <p className="text-xs font-medium text-white/90">Crossmint embedded wallet</p>
      <p className="text-[11px] leading-snug opacity-70">
        Use the button below to open Crossmint&apos;s sign-in window—there you can choose email or Google.
        This page does not show Google/email fields inline. After sign-in, your Solana recipient address
        appears here for Claim NFT (or paste an address manually below).
      </p>

      {auth.status === "logged-in" && walletStatus === "in-progress" ? (
        <p className="text-xs opacity-70">Creating your Solana wallet…</p>
      ) : null}

      {wallet?.address ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs">
          <span className="opacity-70">Recipient address</span>
          <p className="mt-1 break-all font-mono text-emerald-200/90">{wallet.address}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            disabled={authBusy || auth.status === "logged-in"}
            onClick={() => auth.login()}
          >
            {authBusy ? "Please wait…" : "Sign in with Crossmint"}
          </button>
          <p className="text-[10px] leading-snug opacity-55">
            Opens Crossmint&apos;s sign-in dialog (hosted by Crossmint). After you finish, your wallet
            address loads above automatically.
          </p>
        </div>
      )}

      {auth.status === "logged-in" ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs border border-white/10"
          onClick={() => {
            void auth.logout();
          }}
        >
          Sign out of Crossmint
        </button>
      ) : null}
    </div>
  );
}
