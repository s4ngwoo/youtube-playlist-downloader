import { openUrl } from "@tauri-apps/plugin-opener";
import { Mail, FileText, Stethoscope } from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";
import { invoke } from "@tauri-apps/api/core";

type EnvironmentReport = {
  ffmpeg_found: boolean;
  ffmpeg_location: string | null;
  deno_found: boolean;
  deno_path: string | null;
  sidecar_expected_name: string;
  os: string;
  arch: string;
  warnings: string[];
  install_hints: string[];
};

export function Footer() {
  const openLogWindow = async () => {
    try {
      await invoke("open_log_window");
    } catch (err) {
      console.error("Failed to open log window:", err);
    }
  };

  const runEnvironmentDiagnose = async () => {
    try {
      const report = await invoke<EnvironmentReport>("diagnose_environment");
      const lines = [
        `OS: ${report.os} / ${report.arch}`,
        `FFmpeg: ${report.ffmpeg_found ? report.ffmpeg_location : "없음"}`,
        `Deno: ${report.deno_found ? report.deno_path : "없음 (권장)"}`,
        `yt-dlp 사이드카 기대 파일: ${report.sidecar_expected_name}`,
        ...(report.warnings.length
          ? ["", "경고:", ...report.warnings.map((w) => `- ${w}`)]
          : ["", "경고 없음"]),
        ...(report.install_hints.length
          ? ["", "설치 힌트:", ...report.install_hints.map((h) => `- ${h}`)]
          : []),
        "",
        "자세한 내용은 앱 로그에도 기록됩니다.",
      ];
      window.alert(lines.join("\n"));
    } catch (err) {
      console.error("환경 진단 실패:", err);
      window.alert(`환경 진단 실패: ${err}`);
    }
  };

  return (
    <footer className="w-full max-w-5xl mt-auto pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span>YouTube Playlist Downloader</span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-neutral-700" />
          <span>
            Developed by{" "}
            <span className="text-neutral-300 font-medium">Lee SangWoo</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openUrl("mailto:s4ngwoo.lee@gmail.com")}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="이메일 보내기"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>s4ngwoo.lee@gmail.com</span>
          </button>
          <button
            type="button"
            onClick={() => openUrl("https://github.com/s4ngwoo")}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="GitHub 프로필 열기"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>github.com/s4ngwoo</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={runEnvironmentDiagnose}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 cursor-pointer"
          title="FFmpeg / Deno / yt-dlp 사이드카 진단"
        >
          <Stethoscope className="w-3.5 h-3.5" />
          환경 진단
        </button>
        <button
          type="button"
          onClick={openLogWindow}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          앱 로그
        </button>
      </div>
    </footer>
  );
}
