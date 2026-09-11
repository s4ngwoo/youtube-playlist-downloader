import { invoke } from "@tauri-apps/api/core";
import type { AudioFileEntry, AudioMetadata } from "../types/download";

export function listAudioFiles(dirPath: string) {
  return invoke<AudioFileEntry[]>("list_audio_files", { dirPath });
}

export function readMetadata(filePath: string) {
  return invoke<AudioMetadata>("read_metadata", { filePath });
}

export function writeMetadata(filePath: string, metadata: AudioMetadata) {
  return invoke<string>("write_metadata", { filePath, metadata });
}
