import { invoke } from "@tauri-apps/api/core";

export type EnvironmentReport = {
  ffmpegFound: boolean;
  ffmpegLocation: string | null;
  ffmpegSource: string | null;
  denoFound: boolean;
  denoPath: string | null;
  sidecarExpectedName: string;
  ffmpegExpectedName: string;
  os: string;
  arch: string;
  warnings: string[];
  installHints: string[];
  ytdlpSource: string;
  ytdlpVersion: string | null;
  ytdlpPath: string | null;
};

export type YtdlpStatus = {
  source: string;
  version: string | null;
  path: string | null;
  overridePath: string;
};

export function diagnoseEnvironment() {
  return invoke<EnvironmentReport>("diagnose_environment");
}

export function updateYtdlp() {
  return invoke<YtdlpStatus>("update_ytdlp");
}

export function openLogWindow() {
  return invoke("open_log_window");
}
