import { describe, expect, it } from "vitest";
import { translate } from "./index";
import { mapBackendMessage } from "./mapBackendMessage";
import { mapEnvCode } from "./mapEnvCode";
import { en } from "./locales/en";
import { ko } from "./locales/ko";

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en", "form.progressDone", { done: 1, total: 2, percent: "50.0" })).toContain(
      "1/2",
    );
  });
});

describe("mapBackendMessage", () => {
  const t = (key: string, vars?: Record<string, string | number>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key;

  it("maps ffmpeg and sidecar codes", () => {
    expect(mapBackendMessage("download_error: error.ffmpeg_missing", t)).toBe(
      "errors.ffmpegMissing",
    );
    expect(mapBackendMessage("download_error: error.sidecar_unavailable:yt-dlp-x", t)).toBe(
      'errors.sidecarUnavailable:{"name":"yt-dlp-x"}',
    );
  });

  it("maps ok codes", () => {
    expect(mapBackendMessage("ok.download_complete", t)).toBe("ok.downloadComplete");
    expect(mapBackendMessage("ok.download_partial:2:1", t)).toBe(
      'ok.downloadPartial:{"success":"2","fail":"1"}',
    );
    expect(mapBackendMessage("ok.metadata_updated", t)).toBe("ok.metadataUpdated");
    expect(mapBackendMessage("ok.cancelled", t)).toBe("ok.cancelled");
  });

  it("maps empty url and zip codes", () => {
    expect(mapBackendMessage("error.empty_url", t)).toBe("errors.emptyUrl");
    expect(mapBackendMessage("ok.zip_created:3", t)).toBe('ok.zipCreated:{"count":"3"}');
  });

  it("maps ytdlp update failure", () => {
    expect(mapBackendMessage("download_error: error.ytdlp_update_failed:HTTP 404", t)).toBe(
      'errors.ytdlpUpdateFailed:{"detail":"HTTP 404"}',
    );
  });

  it("falls back to generic for unknown", () => {
    expect(mapBackendMessage("weird.raw", t)).toBe('errors.generic:{"detail":"weird.raw"}');
  });

  it("maps remaining download and zip codes", () => {
    expect(mapBackendMessage("download_error: error.no_items", t)).toBe("errors.noItems");
    expect(mapBackendMessage("error.all_failed", t)).toBe("errors.allFailed");
    expect(mapBackendMessage("ok.cancelled", t)).toBe("ok.cancelled");
    expect(mapBackendMessage("ok.zip_created:4", t)).toBe('ok.zipCreated:{"count":"4"}');
  });

  it("maps directory zip logger and leftover ok codes", () => {
    expect(mapBackendMessage("filesystem_error: error.invalid_download_dir", t)).toBe(
      "errors.invalidDir",
    );
    expect(mapBackendMessage("error.no_audio_for_zip", t)).toBe("errors.noAudioForZip");
    expect(mapBackendMessage("error.logger_not_ready", t)).toBe("errors.loggerNotReady");
    expect(mapBackendMessage("ok.logs_cleared", t)).toBe("ok.logsCleared");
    expect(mapBackendMessage("", t)).toBe("");
  });

  it("maps sidecar codes from backtick Korean copy", () => {
    expect(mapBackendMessage("yt-dlp 사이드카를 준비할 수 없습니다: `yt-dlp-x`", t)).toBe(
      'errors.sidecarUnavailable:{"name":"yt-dlp-x"}',
    );
  });

  it("maps legacy Korean ffmpeg copy and unknown codes", () => {
    expect(mapBackendMessage("FFmpeg를 찾을 수 없습니다", t)).toBe("errors.ffmpegMissing");
    expect(mapBackendMessage("download_error: mystery failure", t)).toBe(
      'errors.generic:{"detail":"mystery failure"}',
    );
  });
});

describe("mapEnvCode", () => {
  const t = (key: string) => key;

  it("maps warn and hint codes", () => {
    expect(mapEnvCode("warn.ffmpeg_missing", t)).toBe("env.warn.ffmpegMissing");
    expect(mapEnvCode("hint.ffmpeg.bundled", t)).toBe("env.hint.ffmpegBundled");
    expect(mapEnvCode("hint.deno.macos", t)).toBe("env.hint.denoMacos");
  });

  it("passes through unknown codes", () => {
    expect(mapEnvCode("unknown.code", t)).toBe("unknown.code");
  });

  it("maps empty-ish codes safely", () => {
    expect(mapEnvCode("", t)).toBe("");
  });

  it("maps remaining diagnose codes", () => {
    expect(mapEnvCode("warn.deno_missing", t)).toBe("env.warn.denoMissing");
    expect(mapEnvCode("hint.ffmpeg.macos", t)).toBe("env.hint.ffmpegMacos");
    expect(mapEnvCode("hint.ffmpeg.windows", t)).toBe("env.hint.ffmpegWindows");
    expect(mapEnvCode("hint.deno.windows", t)).toBe("env.hint.denoWindows");
  });
});

describe("locale catalogs", () => {
  it("keeps ko and en on the same key set", () => {
    expect(Object.keys(ko).sort()).toEqual(Object.keys(en).sort());
  });
});
