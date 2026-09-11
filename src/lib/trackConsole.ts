/** Per-track yt-dlp console buffer for Advanced view (pure). */

export const TRACK_CONSOLE_MAX_LINES = 6;

/** Keep the newest `max` non-empty lines (FIFO trim from the front). */
export function pushTrackConsoleLine(
  prev: string[] | undefined,
  line: string,
  max: number = TRACK_CONSOLE_MAX_LINES,
): string[] {
  const trimmed = line.replace(/\r/g, "").trim();
  if (!trimmed) return prev ?? [];
  // Skip pure progress spam duplicates of the exact same string
  if (prev?.length && prev[prev.length - 1] === trimmed) {
    return prev;
  }
  const next = [...(prev ?? []), trimmed];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}
