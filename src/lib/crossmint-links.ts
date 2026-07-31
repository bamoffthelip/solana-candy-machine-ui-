/** Docs / console URL for “get a Crossmint wallet” style links. Override via env without editing components. */
export const CROSSMINT_WALLET_HELP_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CROSSMINT_WALLET_HELP_URL?.trim()) ||
  "https://docs.crossmint.com/wallets/quickstarts/react";
