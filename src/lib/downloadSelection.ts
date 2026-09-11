/** Pure helpers for download track selection (no Tauri). */

export type TrackRef = { url: string; index: number; title?: string };

export function selectTracksByIndices<T extends TrackRef>(
  tracks: T[],
  indices: number[],
): TrackRef[] {
  const wanted = new Set(indices);
  return tracks
    .filter((tr) => wanted.has(tr.index))
    .map((tr) => ({ url: tr.url, index: tr.index, title: tr.title }));
}
