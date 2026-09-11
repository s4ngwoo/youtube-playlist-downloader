/** Pure helpers for per-track title merge and display sort. */

export type TrackStatusRank =
  | "pending"
  | "downloading"
  | "extracting"
  | "converting_art"
  | "tagging"
  | "completed"
  | "failed";

export type SortableTrack = {
  index: number;
  status: TrackStatusRank;
};

const STATUS_RANK: Record<TrackStatusRank, number> = {
  failed: 0,
  downloading: 1,
  extracting: 2,
  converting_art: 2,
  tagging: 2,
  pending: 3,
  completed: 4,
};

function isGenericFallbackTitle(title: string, index: number): boolean {
  const padded = index.toString().padStart(2, "0");
  const patterns = [
    new RegExp(`^Track\\s*#\\s*0*${index}$`, "i"),
    new RegExp(`^트랙\\s*#\\s*0*${index}$`),
    new RegExp(`^Track\\s*#\\s*${padded}$`, "i"),
    new RegExp(`^트랙\\s*#\\s*${padded}$`),
  ];
  return patterns.some((re) => re.test(title.trim()));
}

export function formatFallbackTrackTitle(index: number): string {
  return `Track #${index.toString().padStart(2, "0")}`;
}

/**
 * Prefer a real title over empty / generic `Track #N` fallbacks.
 * Never clobber an existing real title with blank or fallback incoming.
 */
export function mergeTrackTitle(
  existing: string | undefined | null,
  incoming: string | undefined | null,
  index: number,
): string {
  const existingTrim = existing?.trim() ?? "";
  const incomingTrim = incoming?.trim() ?? "";

  const existingOk = existingTrim.length > 0 && !isGenericFallbackTitle(existingTrim, index);
  const incomingOk = incomingTrim.length > 0 && !isGenericFallbackTitle(incomingTrim, index);

  if (incomingOk) return incomingTrim;
  if (existingOk) return existingTrim;
  if (existingTrim.length > 0) return existingTrim;
  if (incomingTrim.length > 0) return incomingTrim;
  return formatFallbackTrackTitle(index);
}

/** Display order: failed → downloading → postprocess → pending → completed; index asc within group. */
export function sortTracksForDisplay<T extends SortableTrack>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 99;
    const rb = STATUS_RANK[b.status] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.index - b.index;
  });
}
