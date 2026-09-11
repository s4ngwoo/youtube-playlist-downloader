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
