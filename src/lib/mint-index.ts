/**
 * Per-project metadata index for cNFT mints (in-memory).
 *
 * Do not use this from serverless production APIs: each cold start resets the counter
 * and you will mint duplicate indices. Use `reserveClaim` from `claim-store.ts` instead
 * (Upstash / file-backed persistent counter).
 */

const counters: Record<string, number> = {};

export function nextMetadataIndex(projectId: string, startFrom: number): number {
  if (counters[projectId] === undefined) {
    counters[projectId] = startFrom;
  }
  const idx = counters[projectId];
  counters[projectId] = idx + 1;
  return idx;
}
