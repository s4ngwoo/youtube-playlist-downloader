import { DownloadStatus, isCancelledDownloadOutcome } from "../types/download";

export type DownloadSuccessPlan = {
  status: "cancelled" | "completed";
  messageCode: string;
  saveHistory: boolean;
};

/** Decide UI + history after download_audio returns; Cancel must not save history. */
export function planDownloadSuccess(
  status: DownloadStatus,
  result: string | null | undefined,
  options?: { saveHistory?: boolean },
): DownloadSuccessPlan {
  if (isCancelledDownloadOutcome(status, result)) {
    return { status: "cancelled", messageCode: "ok.cancelled", saveHistory: false };
  }
  return {
    status: "completed",
    messageCode: result || "ok.download_complete",
    saveHistory: Boolean(options?.saveHistory),
  };
}

/** Thrown download_audio errors must not overwrite an in-flight Cancel. */
export function shouldIgnoreDownloadFailure(status: DownloadStatus): boolean {
  return isCancelledDownloadOutcome(status);
}
