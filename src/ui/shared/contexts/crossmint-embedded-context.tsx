import { createContext, useContext } from "react";

export type CrossmintEmbeddedContextValue = {
  /** True only after client mount and when a public Crossmint API key is present (providers wrap the tree). */
  embeddedWalletReady: boolean;
  /** Set when `@crossmint/client-sdk-react-ui` fails to load (network, ad blocker, CSP). */
  crossmintModuleError: string | null;
};

const CrossmintEmbeddedContext = createContext<CrossmintEmbeddedContextValue>({
  embeddedWalletReady: false,
  crossmintModuleError: null,
});

export function useCrossmintEmbedded(): CrossmintEmbeddedContextValue {
  return useContext(CrossmintEmbeddedContext);
}

export { CrossmintEmbeddedContext };
