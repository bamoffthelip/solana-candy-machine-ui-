/**
 * Crossmint Wallets SDK Solana chain literal for `createOnLogin`.
 * The SDK types only expose `"solana"` (not `solana-devnet`); staging vs production is determined
 * by your Crossmint API key environment in the console.
 * @see https://docs.crossmint.com/sdk-reference/wallets/typescript/type-aliases/SolanaChain
 */
export function getCrossmintSolanaChain(): "solana" {
  return "solana";
}
