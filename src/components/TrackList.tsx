import { useState, useMemo } from "react";
import { ListOrdered, Disc3, AlertCircle } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDownloadStore } from "../store/downloadStore";
import { useDownloadFlow } from "../hooks/useDownloadFlow";
import { sortTracksForDisplay } from "../lib/trackProgress";
import { TrackRow } from "./TrackRow";
import { useI18n } from "../i18n";

export function TrackList() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");
  const { playlistTitle, totalItems, tracks } = useDownloadStore(
    useShallow((s) => ({
      playlistTitle: s.playlistTitle,
      totalItems: s.totalItems,
      tracks: s.tracks,
    })),
  );
  const { handleRetryFailedDownloads } = useDownloadFlow();

  const trackList = useMemo(() => {
    return sortTracksForDisplay(Array.from(tracks.values()));
  }, [tracks]);

  const failedTracks = useMemo(() => trackList.filter((tr) => tr.status === "failed"), [trackList]);
  const failedCount = failedTracks.length;

  const onRetryFailed = () => {
    if (failedCount > 0) {
      handleRetryFailedDownloads(failedTracks.map((tr) => tr.index));
    }
  };

  return (
    <section className="bg-neutral-900/70 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-5 py-3.5 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListOrdered className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-neutral-200">{t("tracks.title")}</h2>
          {playlistTitle && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950/50 text-rose-300 border border-rose-800/40 font-medium truncate max-w-md">
              {playlistTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-neutral-900 rounded-md border border-neutral-800 p-0.5">
            <button
              onClick={() => setViewMode("basic")}
              className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-colors ${
                viewMode === "basic"
                  ? "bg-neutral-800 text-neutral-200 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t("tracks.basic")}
            </button>
            <button
              onClick={() => setViewMode("advanced")}
              className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-colors ${
                viewMode === "advanced"
                  ? "bg-neutral-800 text-neutral-200 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t("tracks.advanced")}
            </button>
          </div>

          {failedCount > 0 && (
            <button
              onClick={onRetryFailed}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-md transition-colors shadow-sm flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {t("tracks.retryFailed", { count: failedCount })}
            </button>
          )}
          <span className="text-xs font-mono text-neutral-400">
            {totalItems > 0
              ? t("tracks.summary", {
                  total: totalItems,
                  found: trackList.length,
                })
              : t("tracks.empty")}
          </span>
        </div>
      </div>

      <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        {trackList.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-neutral-600 gap-2 text-center">
            <Disc3 className="w-8 h-8 opacity-40 animate-[spin_8s_linear_infinite]" />
            <p className="text-xs text-neutral-500">{t("tracks.emptyHint")}</p>
          </div>
        ) : (
          trackList.map((track) => <TrackRow key={track.index} track={track} viewMode={viewMode} />)
        )}
      </div>
    </section>
  );
}
