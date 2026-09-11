/** Resolve which folder to open from a history row. */

export function resolveHistoryFolder(
  item: { downloadDir?: string | null },
  currentDownloadDir?: string | null,
): string | null {
  const fromItem = item.downloadDir?.trim();
  if (fromItem) return fromItem;
  const fromSettings = currentDownloadDir?.trim();
  if (fromSettings) return fromSettings;
  return null;
}

/**
 * How History opens a folder in the OS file manager.
 *
 * `opener:default` grants `allow-reveal-item-in-dir` but **not** `allow-open-path`,
 * so `openPath` fails at runtime. Prefer reveal-in-dir.
 */
export const HISTORY_FOLDER_OPEN_VIA = "reveal-in-dir" as const;

export type HistoryFolderOpenVia = typeof HISTORY_FOLDER_OPEN_VIA;
