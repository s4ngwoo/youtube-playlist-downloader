/** Overall progress bar helpers (pure). */

export type ProgressTrack = {
  status: string;
  progress: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Per-track contribution so postprocess plateaus do not look like “almost done forever”. */
export function trackDisplayProgress(tr: ProgressTrack): number {
  const p = clamp(tr.progress || 0, 0, 100);
  switch (tr.status) {
    case "completed":
      return 100;
    case "failed":
      return clamp(p, 0, 100);
    case "pending":
      return 0;
    case "extracting":
      return 92;
    case "converting_art":
      return 95;
    case "tagging":
      return 98;
    case "downloading":
    default:
      return (p / 100) * 90;
  }
}

export function computeOverallPercent(tracks: Iterable<ProgressTrack>): number {
  const list = Array.from(tracks);
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, tr) => acc + trackDisplayProgress(tr), 0);
  return clamp(sum / list.length, 0, 100);
}

/** Ignore tiny regressions (event jitter); allow hard reset to ~0. */
export function smoothOverallPercent(prev: number, next: number): number {
  if (next <= 0.5 && prev > 5) return next;
  if (next + 0.35 < prev && next < 99.5) return prev;
  return next;
}
