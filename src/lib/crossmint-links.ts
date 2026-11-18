/** Docs / console URL for “get a Crossmint wallet” style links. Override via env without editing components. */
export const CROSSMINT_WALLET_HELP_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CROSSMINT_WALLET_HELP_URL?.trim()) ||
  "https://docs.crossmint.com/wallets/quickstarts/react";

/**
 * Hosted Crossmint collection portal — users sign in with the same email/Google
 * used during claim to view NFTs in their MPC wallet.
 * @see https://docs.crossmint.com/minting/nfts/integrate/manage-delivery
 */
export const CROSSMINT_USER_COLLECTION_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CROSSMINT_USER_COLLECTION_URL?.trim()) ||
  "https://www.crossmint.com/user/collection";
