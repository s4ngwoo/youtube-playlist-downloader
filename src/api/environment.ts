import { invoke } from "@tauri-apps/api/core";

export type EnvironmentReport = {
  ffmpeg_found: boolean;
  ffmpeg_location: string | null;
  deno_found: boolean;
  deno_path: string | null;
  sidecar_expected_name: string;
  os: string;
  arch: string;
  warnings: string[];
  install_hints: string[];
  ytdlp_source: string;
  ytdlp_version: string | null;
  ytdlp_path: string | null;
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
