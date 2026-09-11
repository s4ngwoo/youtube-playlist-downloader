import { CheckCircle2, AlertCircle, ListMusic, Edit3 } from "lucide-react";
import { useDownloadStore } from "../store/downloadStore";
import { useI18n } from "../i18n";
import { AppLocale } from "../types/settings";
import { useSettingsActions } from "../hooks/useSettingsActions";

interface HeaderProps {
  onOpenMetadataEditor?: () => void;
}

export function Header({ onOpenMetadataEditor }: HeaderProps) {
  const status = useDownloadStore((s) => s.status);
  const { t, locale } = useI18n();
  const { handleLocaleChange } = useSettingsActions();

  return (
    <header
      data-tauri-drag-region
      className="shrink-0 w-full flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-neutral-800/80 gap-4 select-none cursor-default"
    >
      <div data-tauri-drag-region className="flex items-center gap-3.5">
        <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-red-500 rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center shrink-0">
          <ListMusic className="w-6 h-6 text-white" />
        </div>
        <div data-tauri-drag-region className="flex flex-col justify-center">
          <h1
            data-tauri-drag-region
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent leading-tight"
          >
            YouTube Playlist & Audio Downloader
          </h1>
          <p
            data-tauri-drag-region
            className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1"
          >
            <span>{t("header.taglineStack")}</span>
            <span className="inline-block w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-rose-400 font-medium">{t("header.taglineQuality")}</span>
          </p>
        </div>
      </div>

      <div data-tauri-drag-region="false" className="flex items-center gap-2.5 shrink-0">
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="sr-only">{t("lang.switch")}</span>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
            className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-300 hover:text-white focus:outline-none focus:border-rose-500 cursor-pointer"
            title={t("lang.switch")}
          >
            <option value="ko">{t("lang.ko")}</option>
            <option value="en">{t("lang.en")}</option>
          </select>
        </label>

        {onOpenMetadataEditor && (
          <button
            type="button"
            onClick={onOpenMetadataEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 shadow-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer text-xs font-semibold"
            title={t("header.metadataEditorTitle")}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {t("header.metadataEditor")}
          </button>
        )}

        {status === "downloading" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            {t("header.status.downloading")}
          </span>
        )}
        {status === "completed" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("header.status.completed")}
          </span>
        )}
        {status === "cancelled" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            {t("header.status.cancelled")}
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            {t("header.status.error")}
          </span>
        )}
        {status === "idle" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-800/80 text-neutral-400 border border-neutral-700/50">
            {t("header.status.idle")}
          </span>
        )}
      </div>
    </header>
  );
}
