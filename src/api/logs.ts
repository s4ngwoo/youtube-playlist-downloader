import { invoke } from "@tauri-apps/api/core";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogEntry = {
  level: LogLevel;
  timestamp: string;
  source: string;
  message: string;
};

export function readAppLogs(maxLines = 2000) {
  return invoke<LogEntry[]>("read_app_logs", { maxLines });
}

export function getAppLogPath() {
  return invoke<string>("get_app_log_path");
}

export function clearAppLogs() {
  return invoke("clear_app_logs");
}
