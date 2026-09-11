import { openUrl } from "@tauri-apps/plugin-opener";
import { Mail, FileText, Stethoscope } from "lucide-react";
import { diagnoseEnvironment, openLogWindow } from "../api/environment";
import { useI18n } from "../i18n";
import { mapBackendMessage } from "../i18n/mapBackendMessage";
import { mapEnvCode } from "../i18n/mapEnvCode";
import { GithubIcon } from "./icons/GithubIcon";

export function Footer() {
  const { t } = useI18n();

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
    if (source === "system") return t("footer.diag.source.system");
    return source;
  };

  const runEnvironmentDiagnose = async () => {
    try {
      const report = await diagnoseEnvironment();
      const ffmpegValue = report.ffmpegFound
        ? `${report.ffmpegLocation ?? ""}${
            report.ffmpegSource ? ` (${sourceLabel(report.ffmpegSource)})` : ""
          }`
        : t("footer.diag.none");
      const lines = [
        t("footer.diag.os", { os: report.os, arch: report.arch }),
        t("footer.diag.ffmpeg", { value: ffmpegValue }),
        t("footer.diag.deno", {
          value: report.denoFound ? String(report.denoPath ?? "") : t("footer.diag.denoNone"),
        }),
        t("footer.diag.sidecar", { name: report.sidecarExpectedName }),
        t("footer.diag.ffmpegSidecar", { name: report.ffmpegExpectedName }),
        t("footer.diag.ytdlpSource", {
          source: sourceLabel(report.ytdlpSource),
        }),
        t("footer.diag.ytdlpVersion", {
          version: report.ytdlpVersion ?? t("footer.diag.none"),
        }),
        ...(report.ytdlpPath ? [t("footer.diag.ytdlpPath", { path: report.ytdlpPath })] : []),
        ...(report.warnings.length
          ? ["", t("footer.diag.warnings"), ...report.warnings.map((w) => `- ${mapEnvCode(w, t)}`)]
          : ["", t("footer.diag.noWarnings")]),
        ...(report.installHints.length
          ? ["", t("footer.diag.hints"), ...report.installHints.map((h) => `- ${mapEnvCode(h, t)}`)]
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

  return (
    <footer className="w-full max-w-5xl mt-auto pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs text-neutral-500">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 min-w-0">
        <div className="flex flex-col gap-0.5 leading-relaxed">
          <span className="text-neutral-400">YouTube Playlist Downloader</span>
          <span>
            {t("footer.developedBy")}{" "}
            <span className="text-neutral-300 font-medium">Lee SangWoo</span>
          </span>
        </div>

        <div className="flex flex-col gap-0.5 items-start">
          <button
            type="button"
            onClick={() => openUrl("mailto:s4ngwoo.lee@gmail.com")}
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title={t("footer.emailTitle")}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>s4ngwoo.lee@gmail.com</span>
          </button>
          <button
            type="button"
            onClick={() => openUrl("https://github.com/s4ngwoo")}
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={t("footer.githubTitle")}
          >
            <GithubIcon className="w-3.5 h-3.5 shrink-0" />
            <span>github.com/s4ngwoo</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-end">
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
