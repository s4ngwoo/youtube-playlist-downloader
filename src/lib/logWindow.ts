import { getCurrentWindow } from "@tauri-apps/api/window";

/** True when running inside the dedicated log-viewer webview. */
export function isLogViewerWindow(): boolean {
  try {
    if (getCurrentWindow().label === "log-viewer") return true;
  } catch {
    // Not in Tauri (vitest / browser) — fall through to URL check.
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("window") === "log") return true;
  return /(?:^|[?#&])window=log(?:&|$)/.test(window.location.href);
}
