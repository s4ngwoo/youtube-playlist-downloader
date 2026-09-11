import { Folder, FolderOpen, Square, Download, Sparkles, Clock, Archive } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDownloadStore } from "../store/downloadStore";
import { useDownloadFlow } from "../hooks/useDownloadFlow";
import { useSettingsActions } from "../hooks/useSettingsActions";
import { AudioFormat, MAX_CONCURRENCY, MIN_CONCURRENCY } from "../types/settings";
import { useI18n } from "../i18n";

export function DownloadForm() {
  const { t } = useI18n();
  const {
    url,
    setUrl,
    downloadDir,
    concurrency,
    audioFormat,
    status,
    statusMessage,
    totalItems,
    currentSpeed,
    currentEta,
    isZipping,
    tracks,
    isFetchingMetadata,
  } = useDownloadStore(
    useShallow((s) => ({
      url: s.url,
      setUrl: s.setUrl,
      downloadDir: s.downloadDir,
      concurrency: s.concurrency,
      audioFormat: s.audioFormat,
      status: s.status,
      statusMessage: s.statusMessage,
      totalItems: s.totalItems,
      currentSpeed: s.currentSpeed,
      currentEta: s.currentEta,
      isZipping: s.isZipping,
      tracks: s.tracks,
      isFetchingMetadata: s.isFetchingMetadata,
    })),
  );

  const {
    handleSelectFolder: onSelectFolder,
    handleConcurrencyChange,
    handleAudioFormatChange,
  } = useSettingsActions();

  const {
    handleFetchMetadata: onFetchMetadata,
    handleCancelDownload: onCancelDownload,
    handleCreateZip: onCreateZip,
  } = useDownloadFlow();

  const trackList = useMemo(() => Array.from(tracks.values()), [tracks]);
  const completedCount = useMemo(
    () => trackList.filter((tr) => tr.status === "completed").length,
    [trackList],
  );
  const overallPercent = useMemo(() => {
    if (totalItems <= 0) return 0;
    let totalProgressSum = 0;
    for (let i = 1; i <= totalItems; i++) {
      const track = tracks.get(i);
      if (track) {
        if (track.status === "completed") {
          totalProgressSum += 100;
        } else {
          totalProgressSum += track.progress;
        }
      }
    }
    return Math.min(100, Math.max(0, totalProgressSum / totalItems));
  }, [tracks, totalItems]);

  const controlsDisabled = status === "downloading" || isZipping || isFetchingMetadata;

  return (
    <section className="bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <Folder className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="text-neutral-400 shrink-0 font-medium">{t("form.saveLocation")}</span>
            <span
              className="font-mono text-neutral-200 bg-neutral-950/80 border border-neutral-800 px-2.5 py-1 rounded-lg truncate max-w-xs sm:max-w-md md:max-w-lg"
              title={downloadDir}
            >
              {downloadDir || t("form.loadingDir")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={onCreateZip}
            disabled={controlsDisabled || !downloadDir}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800/90 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700/70 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <Archive className={`w-3.5 h-3.5 text-blue-400 ${isZipping ? "animate-pulse" : ""}`} />
            {isZipping ? t("form.zipping") : t("form.zip")}
          </button>

          <button
            type="button"
            onClick={onSelectFolder}
            disabled={controlsDisabled}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800/90 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700/70 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-rose-400" />
            {t("form.changeFolder")}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center text-xs">
        <label className="flex items-center gap-2 text-neutral-400">
          <span className="shrink-0 font-medium">{t("form.concurrency")}</span>
          <select
            value={concurrency}
            disabled={controlsDisabled}
            onChange={(e) => handleConcurrencyChange(Number(e.target.value))}
            className="bg-neutral-950/80 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-rose-500 disabled:opacity-50 cursor-pointer"
          >
            {Array.from(
              { length: MAX_CONCURRENCY - MIN_CONCURRENCY + 1 },
              (_, i) => MIN_CONCURRENCY + i,
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-neutral-400">
          <span className="shrink-0 font-medium">{t("form.audioFormat")}</span>
          <select
            value={audioFormat}
            disabled={controlsDisabled}
            onChange={(e) => handleAudioFormatChange(e.target.value as AudioFormat)}
            className="bg-neutral-950/80 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-rose-500 disabled:opacity-50 cursor-pointer"
          >
            <option value="m4a">AAC (.m4a)</option>
            <option value="mp3">MP3 (.mp3)</option>
          </select>
        </label>
      </div>

      <form onSubmit={onFetchMetadata} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("form.urlPlaceholder")}
            disabled={status === "downloading" || isFetchingMetadata}
            className="w-full h-12 bg-neutral-950/80 border border-neutral-700/80 rounded-xl px-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex gap-2">
          {status === "downloading" ? (
            <button
              type="button"
              onClick={onCancelDownload}
              className="h-12 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-rose-950/40 text-rose-400 border border-rose-800/60 hover:bg-rose-900/60 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              {t("form.cancel")}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!url.trim() || isFetchingMetadata}
              className="h-12 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              {isFetchingMetadata ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  {t("form.fetching")}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t("form.start")}
                </>
              )}
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 pt-5 border-t border-neutral-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-neutral-300 flex items-center gap-2 truncate max-w-[70%]">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </span>
          <span className="font-mono text-neutral-200 font-semibold text-sm shrink-0">
            {totalItems > 0
              ? t("form.progressDone", {
                  done: completedCount,
                  total: totalItems,
                  percent: overallPercent.toFixed(1),
                })
              : `${overallPercent.toFixed(1)}%`}
          </span>
        </div>

        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-red-500 to-pink-500 rounded-full transition-all duration-300 relative overflow-hidden"
            style={{ width: `${overallPercent}%` }}
          >
            {status === "downloading" && (
              <div className="absolute inset-0 bg-white/25 animate-[pulse_1.5s_infinite]" />
            )}
          </div>
        </div>

        {(currentSpeed || currentEta) && status === "downloading" && (
          <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono mt-0.5">
            {currentSpeed && (
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3 text-neutral-500" />
                {t("form.speed")} <span className="text-neutral-200">{currentSpeed}</span>
              </span>
            )}
            {currentEta && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                {t("form.eta")} <span className="text-neutral-200">{currentEta}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
