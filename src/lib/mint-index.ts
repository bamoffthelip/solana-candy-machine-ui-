/**
 * Per-project metadata index for cNFT mints (in-memory).
 * Replace with a database or counter service in production to avoid collisions across instances.
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
