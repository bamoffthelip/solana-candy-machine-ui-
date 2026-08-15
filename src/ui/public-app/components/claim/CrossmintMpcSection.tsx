import { useEffect } from "react";
import {
  useCrossmintAuth,
  useWallet as useCrossmintWallet,
} from "@crossmint/client-sdk-react-ui";

type CrossmintMpcSectionProps = {
  onRecipientAddress: (address: string) => void;
  /** When true, emphasize the primary non-crypto CTA (auto-opened path). */
  emphasizeCta?: boolean;
};

/**
 * Opens Crossmint auth via `login()` (modal with email/Google). After success, `createOnLogin`
 * provisions a Solana wallet; address is forwarded for `/api/claim` as `mpcWalletAddress`.
 *
 * One dialog covers both first-time wallet creation and returning Crossmint sign-in.
 */
export function CrossmintMpcSection({
  onRecipientAddress,
  emphasizeCta = false,
}: CrossmintMpcSectionProps) {
  const { wallet, status: walletStatus } = useCrossmintWallet();
  const auth = useCrossmintAuth();

  useEffect(() => {
    onRecipientAddress(wallet?.address ?? "");
  }, [wallet?.address, onRecipientAddress]);

  const authBusy =
    auth.status === "initializing" || auth.status === "in-progress";

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <p className="text-xs font-medium text-white/90">
        {emphasizeCta ? "Create or sign in to a free wallet" : "Email / Google wallet"}
      </p>
      <p className="text-[11px] leading-snug opacity-70">
        Sign in with Crossmint using email or Google. If you&apos;re new, a Solana wallet is created
        automatically. If you already have a Crossmint account, you&apos;ll use that same wallet.
        Everything happens in the Crossmint window—you never leave this page.
      </p>

      {auth.status === "logged-in" && walletStatus === "in-progress" ? (
        <p className="text-xs opacity-70">Creating your Solana wallet…</p>
      ) : null}

      {wallet?.address ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs">
          <span className="opacity-70">Your wallet is ready — claim below</span>
          <p className="mt-1 break-all font-mono text-emerald-200/90">{wallet.address}</p>
          {auth.user?.email ? (
            <p className="mt-1 text-[10px] opacity-60">Signed in as {auth.user.email}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            className={
              emphasizeCta
                ? "btn btn-primary btn-sm w-full"
                : "btn btn-secondary btn-sm w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            }
            disabled={authBusy || auth.status === "logged-in"}
            onClick={() => auth.login()}
          >
            {authBusy
              ? "Please wait…"
              : emphasizeCta
                ? "Don't have a crypto wallet? Click here"
                : "Sign in with Crossmint"}
          </button>
          <p className="text-[10px] leading-snug opacity-55">
            Opens Crossmint&apos;s sign-in dialog. New and returning users use the same button.
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
