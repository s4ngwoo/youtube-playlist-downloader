import { t as translate } from "./index";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

const ENV_CODE_TO_KEY: Record<string, string> = {
  "warn.ffmpeg_missing": "env.warn.ffmpegMissing",
  "warn.deno_missing": "env.warn.denoMissing",
  "hint.ffmpeg.bundled": "env.hint.ffmpegBundled",
  "hint.ffmpeg.macos": "env.hint.ffmpegMacos",
  "hint.ffmpeg.windows": "env.hint.ffmpegWindows",
  "hint.deno.macos": "env.hint.denoMacos",
  "hint.deno.windows": "env.hint.denoWindows",
};

/** Map environment diagnose warning/hint codes to the active locale. */
export function mapEnvCode(code: string, tFn: TFn = translate): string {
  const key = ENV_CODE_TO_KEY[code.trim()];
  if (key) return tFn(key);
  return code;
}
