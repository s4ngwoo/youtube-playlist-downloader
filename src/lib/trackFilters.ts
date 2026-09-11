/** Track list filter helpers. */

export type TrackFilterMode = "all" | "failed";

export function filterTracksByStatus<T extends { status: string }>(
  tracks: T[],
  mode: TrackFilterMode,
): T[] {
  if (mode === "failed") {
    return tracks.filter((tr) => tr.status === "failed");
  }
  return tracks;
}
