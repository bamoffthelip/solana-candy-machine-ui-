import { PublicKey } from "@solana/web3.js";

/** Split pasted text by newlines/commas and keep valid unique base58 addresses. */
export function parseSolanaAddresses(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    try {
      const pk = new PublicKey(part);
      const s = pk.toBase58();
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    } catch {
      // skip invalid
    }
  }
  return out;
}
