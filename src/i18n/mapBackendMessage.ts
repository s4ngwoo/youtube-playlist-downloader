import { t as translate } from "./index";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

const PREFIX_RE = /^(download_error|metadata_error|filesystem_error|unknown_error):\s*/i;

/** Map Rust IPC codes / legacy Korean messages to the active locale. */
export function mapBackendMessage(raw: string, tFn: TFn = translate): string {
  const text = String(raw ?? "").trim();
  if (!text) return text;

  const body = text.replace(PREFIX_RE, "").trim();

  if (body === "error.ffmpeg_missing" || body.startsWith("error.ffmpeg_missing")) {
    return tFn("errors.ffmpegMissing");
  }

  if (body.startsWith("error.sidecar_unavailable")) {
    const name = body.split(":")[1]?.trim() || body.match(/`([^`]+)`/)?.[1] || "yt-dlp";
    return tFn("errors.sidecarUnavailable", { name });
  }

  if (body === "error.no_items") return tFn("errors.noItems");
  if (body === "error.empty_url") return tFn("errors.emptyUrl");
  if (body === "error.all_failed") return tFn("errors.allFailed");
  if (body === "error.invalid_download_dir") return tFn("errors.invalidDir");
  if (body === "error.no_audio_for_zip") return tFn("errors.noAudioForZip");
  if (body === "error.logger_not_ready") return tFn("errors.loggerNotReady");
  if (body === "error.ytdlp_update_failed" || body.startsWith("error.ytdlp_update_failed:")) {
    const detail = body.includes(":") ? body.slice("error.ytdlp_update_failed:".length) : "";
    return tFn("errors.ytdlpUpdateFailed", { detail: detail || body });
  }

  if (body === "ok.download_complete") return tFn("ok.downloadComplete");
  if (body.startsWith("ok.download_partial:")) {
    const [, success = "0", fail = "0"] = body.split(":");
    return tFn("ok.downloadPartial", { success, fail });
  }
  if (body === "ok.cancelled") return tFn("ok.cancelled");
  if (body === "ok.metadata_updated") return tFn("ok.metadataUpdated");
  if (body.startsWith("ok.zip_created:")) {
    const count = body.split(":")[1] ?? "0";
    return tFn("ok.zipCreated", { count });
  }
  if (body === "ok.logs_cleared") return tFn("ok.logsCleared");

  // Legacy Korean strings (pre-code IPC) — keep mapping for older builds
  if (body.includes("FFmpeg를 찾을 수 없습니다")) {
    return tFn("errors.ffmpegMissing");
  }
  if (body.includes("yt-dlp 사이드카를 준비할 수 없습니다")) {
    const name = body.match(/`([^`]+)`/)?.[1] ?? "yt-dlp";
    return tFn("errors.sidecarUnavailable", { name });
  }

  return tFn("errors.generic", { detail: body });
}
