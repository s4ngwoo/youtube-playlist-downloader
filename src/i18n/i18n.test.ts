import { describe, expect, it } from "vitest";
import { translate } from "./index";
import { mapBackendMessage } from "./mapBackendMessage";
import { mapEnvCode } from "./mapEnvCode";

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en", "form.progressDone", { done: 1, total: 2, percent: "50.0" })).toContain(
      "1/2"
    );
  });
});

describe("mapBackendMessage", () => {
  const t = (key: string, vars?: Record<string, string | number>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key;

  it("maps ffmpeg and sidecar codes", () => {
    expect(mapBackendMessage("download_error: error.ffmpeg_missing", t)).toBe(
      "errors.ffmpegMissing"
    );
    expect(
      mapBackendMessage("download_error: error.sidecar_unavailable:yt-dlp-x", t)
    ).toBe('errors.sidecarUnavailable:{"name":"yt-dlp-x"}');
  });

  it("maps ok codes", () => {
    expect(mapBackendMessage("ok.download_complete", t)).toBe("ok.downloadComplete");
    expect(mapBackendMessage("ok.download_partial:2:1", t)).toBe(
      'ok.downloadPartial:{"success":"2","fail":"1"}'
    );
  });

  it("maps ytdlp update failure", () => {
    expect(
      mapBackendMessage("download_error: error.ytdlp_update_failed:HTTP 404", t)
    ).toBe('errors.ytdlpUpdateFailed:{"detail":"HTTP 404"}');
  });
});

describe("mapEnvCode", () => {
  const t = (key: string) => key;

  it("maps warn and hint codes", () => {
    expect(mapEnvCode("warn.ffmpeg_missing", t)).toBe("env.warn.ffmpegMissing");
    expect(mapEnvCode("hint.deno.macos", t)).toBe("env.hint.denoMacos");
  });

  it("passes through unknown codes", () => {
    expect(mapEnvCode("unknown.code", t)).toBe("unknown.code");
  });
});
