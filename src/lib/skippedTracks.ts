/** Skipped (unavailable) playlist entries — pure helpers. */

export type SkipReason = "private" | "deleted" | "unknown";

export type SkippedTrack = {
  index: number;
  title: string;
  reason: SkipReason;
};

export type SkippedSummary = {
  total: number;
  privateCount: number;
  deletedCount: number;
  unknownCount: number;
};

export function summarizeSkippedTracks(skipped: SkippedTrack[]): SkippedSummary {
  let privateCount = 0;
  let deletedCount = 0;
  let unknownCount = 0;
  for (const s of skipped) {
    if (s.reason === "private") privateCount += 1;
    else if (s.reason === "deleted") deletedCount += 1;
    else unknownCount += 1;
  }
  return {
    total: skipped.length,
    privateCount,
    deletedCount,
    unknownCount,
  };
}
