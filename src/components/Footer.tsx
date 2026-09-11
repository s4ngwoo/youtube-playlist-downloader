import { openUrl } from "@tauri-apps/plugin-opener";
import { Mail, FileText, Stethoscope, RefreshCw } from "lucide-react";
import { useState } from "react";
import { diagnoseEnvironment, openLogWindow, updateYtdlp } from "../api/environment";
import { useI18n } from "../i18n";
import { mapBackendMessage } from "../i18n/mapBackendMessage";
import { mapEnvCode } from "../i18n/mapEnvCode";
import { GithubIcon } from "./icons/GithubIcon";

export function Footer() {
  const { t } = useI18n();
  const [ytdlpBusy, setYtdlpBusy] = useState(false);

  const handleOpenLogWindow = async () => {
    try {
      await openLogWindow();
    } catch (err) {
      console.error("Failed to open log window:", err);
    }
  };

  const sourceLabel = (source: string) => {
    if (source === "override") return t("footer.diag.source.override");
    if (source === "bundled") return t("footer.diag.source.bundled");
    return source;
  };

  const runEnvironmentDiagnose = async () => {
    try {
      const report = await diagnoseEnvironment();
      const lines = [
        `OS: ${report.os} / ${report.arch}`,
        `FFmpeg: ${report.ffmpeg_found ? report.ffmpeg_location : t("footer.diag.none")}`,
        `Deno: ${report.deno_found ? report.deno_path : t("footer.diag.denoNone")}`,
        t("footer.diag.sidecar", { name: report.sidecar_expected_name }),
        t("footer.diag.ytdlpSource", {
          source: sourceLabel(report.ytdlp_source),
        }),
        t("footer.diag.ytdlpVersion", {
          version: report.ytdlp_version ?? t("footer.diag.none"),
        }),
        ...(report.ytdlp_path ? [`yt-dlp path: ${report.ytdlp_path}`] : []),
        ...(report.warnings.length
          ? ["", t("footer.diag.warnings"), ...report.warnings.map((w) => `- ${mapEnvCode(w, t)}`)]
          : ["", t("footer.diag.noWarnings")]),
        ...(report.install_hints.length
          ? [
              "",
              t("footer.diag.hints"),
              ...report.install_hints.map((h) => `- ${mapEnvCode(h, t)}`),
            ]
          : []),
        "",
        t("footer.diag.logNote"),
      ];
      window.alert(lines.join("\n"));
    } catch (err) {
      console.error("Environment diagnose failed:", err);
      window.alert(
        t("footer.diag.failed", {
          error: mapBackendMessage(String(err), t),
        }),
      );
    }
  };

  const handleUpdateYtdlp = async () => {
    if (ytdlpBusy) return;
    setYtdlpBusy(true);
    try {
      const status = await updateYtdlp();
      window.alert(
        t("footer.ytdlpUpdateOk", {
          version: status.version ?? t("footer.diag.none"),
          path: status.path ?? status.overridePath,
        }),
      );
    } catch (err) {
      console.error("yt-dlp update failed:", err);
      window.alert(
        t("footer.ytdlpUpdateFailed", {
          error: mapBackendMessage(String(err), t),
        }),
      );
    } finally {
      setYtdlpBusy(false);
    }
  };

  return (
    <footer className="w-full max-w-5xl mt-auto pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span>YouTube Playlist Downloader</span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-neutral-700" />
          <span>
            Developed by <span className="text-neutral-300 font-medium">Lee SangWoo</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openUrl("mailto:s4ngwoo.lee@gmail.com")}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={t("footer.emailTitle")}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>s4ngwoo.lee@gmail.com</span>
          </button>
          <button
            type="button"
            onClick={() => openUrl("https://github.com/s4ngwoo")}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={t("footer.githubTitle")}
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>github.com/s4ngwoo</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          type="button"
          onClick={handleUpdateYtdlp}
          disabled={ytdlpBusy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          title={t("footer.ytdlpUpdateTitle")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${ytdlpBusy ? "animate-spin" : ""}`} />
          {ytdlpBusy ? t("footer.ytdlpUpdating") : t("footer.ytdlpUpdate")}
        </button>
        <button
          type="button"
          onClick={runEnvironmentDiagnose}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 cursor-pointer"
          title={t("footer.diagnoseTitle")}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          {t("footer.diagnose")}
        </button>
        <button
          type="button"
          onClick={handleOpenLogWindow}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          {t("footer.logs")}
        </button>
      </div>
    </footer>
  );
}
