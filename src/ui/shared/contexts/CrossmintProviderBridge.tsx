import type { FC, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { getCrossmintSolanaChain } from "../../../lib/crossmint-chain";
import { CrossmintEmbeddedContext } from "./crossmint-embedded-context";

function readCrossmintClientApiKey(): string {
  if (typeof process === "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY ||
    process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ||
    ""
  ).trim();
}

/** Keeps Crossmint auth widgets readable on dark claim UI (daisyUI / black/20 panels). */
const crossmintDarkAppearance: UIConfig = {
  colors: {
    background: "#18181b",
    backgroundSecondary: "#27272a",
    textPrimary: "#fafafa",
    textSecondary: "#a1a1aa",
    accent: "#818cf8",
    buttonBackground: "#3f3f46",
    inputBackground: "#27272a",
    border: "#3f3f46",
    danger: "#f87171",
    textLink: "#93c5fd",
  },
};

type CrossmintUIModule = typeof import("@crossmint/client-sdk-react-ui");

/**
 * Wraps the app with Crossmint providers when `NEXT_PUBLIC_CROSSMINT_*` is set.
 * Crossmint is loaded with `import()` only after mount so `next build` / SSG does not execute
 * their SDK on the server (avoids multi-minute static generation timeouts).
 */
export const CrossmintProviderBridge: FC<{ children: ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [crossmintUi, setCrossmintUi] = useState<CrossmintUIModule | null>(null);
  const [crossmintModuleError, setCrossmintModuleError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiKey = useMemo(() => readCrossmintClientApiKey(), []);
  const chain = useMemo(() => getCrossmintSolanaChain(), []);

  useEffect(() => {
    if (!mounted || !apiKey) return;
    let cancelled = false;
    setCrossmintModuleError(null);
    void import("@crossmint/client-sdk-react-ui")
      .then((mod) => {
        if (!cancelled) setCrossmintUi(mod);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCrossmintModuleError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, apiKey]);

  const embeddedWalletReady = mounted && Boolean(apiKey) && crossmintUi !== null;

  const shell = (
    <CrossmintEmbeddedContext.Provider value={{ embeddedWalletReady, crossmintModuleError }}>
      {children}
    </CrossmintEmbeddedContext.Provider>
  );

  if (!mounted || !apiKey || !crossmintUi) {
    return shell;
  }

  const { CrossmintAuthProvider, CrossmintProvider, CrossmintWalletProvider } = crossmintUi;

  return (
    <CrossmintEmbeddedContext.Provider value={{ embeddedWalletReady: true, crossmintModuleError: null }}>
      <CrossmintProvider apiKey={apiKey}>
        <CrossmintAuthProvider
          appearance={crossmintDarkAppearance}
          loginMethods={["email", "google"]}
          authModalTitle="Sign in to claim"
        >
          <CrossmintWalletProvider
            appearance={crossmintDarkAppearance}
            createOnLogin={{
              chain,
              recovery: { type: "email" },
            }}
          >
            {children}
          </CrossmintWalletProvider>
        </CrossmintAuthProvider>
      </CrossmintProvider>
    </CrossmintEmbeddedContext.Provider>
  );
};
