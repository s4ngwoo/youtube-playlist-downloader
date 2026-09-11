export interface DownloadHistoryItem {
  url: string;
  title: string;
  date: string; // ISO 8601 format
  /** Folder used for that download when known. */
  downloadDir?: string;
}
