import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { PlaylistMetadata, ProgressPayload } from "../types/download";
import type { AudioFormat } from "../types/settings";

export type SelectedTrack = { url: string; index: number };

export type DownloadAudioArgs = {
  downloadDir: string | null;
  playlistTitle: string;
  selectedTracks: SelectedTrack[];
  concurrency: number;
  audioFormat: AudioFormat;
};

export function fetchMetadata(url: string) {
  return invoke<PlaylistMetadata>("fetch_metadata", { url });
}

export function downloadAudio(args: DownloadAudioArgs) {
  return invoke<string>("download_audio", args);
}

export function cancelDownload() {
  return invoke<string>("cancel_download");
}

export function createMobileZip(downloadDir: string) {
  return invoke<string>("create_mobile_zip", { downloadDir });
}

export function getDefaultDownloadDir() {
  return invoke<string>("get_default_download_dir");
}

export function onDownloadProgress(
  handler: (payload: ProgressPayload) => void,
): Promise<UnlistenFn> {
  return listen<ProgressPayload>("download-progress", (event) => {
    handler(event.payload);
  });
}
