import React from "react";
import { CheckCircle2, Sparkles, Music2, Download, AlertCircle } from "lucide-react";
import { TrackItem as TrackItemType } from "../types/download";
import { useI18n } from "../i18n";
import { mapBackendMessage } from "../i18n/mapBackendMessage";
import { parseEtaToSeconds } from "../lib/sessionEta";

interface TrackRowProps {
  track: TrackItemType;
  viewMode: "basic" | "advanced";
}

function advancedStageLabel(
  status: TrackItemType["status"],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  switch (status) {
    case "completed":
      return t("track.advanced.completed");
    case "tagging":
      return t("track.advanced.tagging");
    case "converting_art":
      return t("track.advanced.convertingArt");
    case "extracting":
      return t("track.advanced.extracting");
    case "failed":
      return t("track.advanced.failed");
    case "pending":
      return t("track.advanced.pending");
    case "downloading":
      return t("track.advanced.downloading");
    default:
      return status;
  }
}

export const TrackRow = React.memo(function TrackRow({ track, viewMode }: TrackRowProps) {
  const { t } = useI18n();
  const isActive =
    track.status === "downloading" ||
    track.status === "extracting" ||
    track.status === "converting_art" ||
    track.status === "tagging";

  return (
    <div
      className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
        track.status === "downloading"
          ? "bg-neutral-900 border-rose-500/40 shadow-sm"
          : track.status === "completed"
            ? "bg-neutral-950/60 border-neutral-800/80 opacity-90"
            : track.status === "extracting" ||
                track.status === "converting_art" ||
                track.status === "tagging"
              ? "bg-purple-950/20 border-purple-500/30"
              : "bg-neutral-950/40 border-neutral-800/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
            {track.index.toString().padStart(2, "0")}
          </span>
          <span className="text-sm font-medium text-neutral-200 truncate">{track.title}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {viewMode === "basic" ? (
            <>
              {track.status === "completed" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("track.status.completed")}
                </span>
              )}
              {(track.status === "tagging" ||
                track.status === "converting_art" ||
                track.status === "extracting") && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/50 px-2 py-0.5 rounded-md animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  {t("track.status.optimizing")}
                </span>
              )}
              {track.status === "downloading" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-950/40 border border-blue-800/50 px-2 py-0.5 rounded-md">
                  <Download className="w-3 h-3 animate-bounce" />
                  {t("track.status.downloading", {
                    progress: track.progress.toFixed(0),
                  })}
                </span>
              )}
              {track.status === "failed" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3 h-3" />
                  {t("track.status.failed")}
                </span>
              )}
              {track.status === "pending" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md">
                  {t("track.status.pending")}
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 font-mono">
              {track.status === "downloading" && (
                <>
                  {track.speed && parseEtaToSeconds(track.eta) != null && (
                    <span className="text-[10px] text-neutral-400 tracking-tighter">
                      {track.speed} | ETA {track.eta}
                    </span>
                  )}
                  {!track.speed && parseEtaToSeconds(track.eta) != null && (
                    <span className="text-[10px] text-neutral-400 tracking-tighter">
                      ETA {track.eta}
                    </span>
                  )}
                  {track.speed && parseEtaToSeconds(track.eta) == null && (
                    <span className="text-[10px] text-neutral-400 tracking-tighter">
                      {track.speed}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-blue-400">
                    {track.progress.toFixed(1)}%
                  </span>
                </>
              )}
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  track.status === "completed"
                    ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50"
                    : track.status === "failed"
                      ? "text-rose-400 bg-rose-950/40 border-rose-800/50"
                      : track.status === "pending"
                        ? "text-neutral-500 bg-neutral-900 border-neutral-800"
                        : track.status === "downloading"
                          ? "text-blue-400 bg-blue-950/40 border-blue-800/50"
                          : "text-violet-300 bg-violet-950/30 border-violet-800/40"
                }`}
              >
                {track.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                {track.status === "failed" && <AlertCircle className="w-3 h-3" />}
                {track.status === "downloading" && <Download className="w-3 h-3" />}
                {(track.status === "extracting" ||
                  track.status === "converting_art" ||
                  track.status === "tagging") && <Music2 className="w-3 h-3" />}
                {advancedStageLabel(track.status, t)}
              </span>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500 rounded-full transition-all duration-150"
            style={{ width: `${track.progress}%` }}
          />
        </div>
      )}

      {viewMode === "advanced" && (track.consoleLines?.length ?? 0) > 0 && (
        <div
          className="mt-0.5 rounded-md border border-neutral-800 bg-black/50 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-neutral-400 overflow-hidden"
          aria-label={t("track.advanced.console")}
        >
          {track.consoleLines!.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`} className="truncate">
              <span className="text-neutral-600 select-none">› </span>
              {line}
            </div>
          ))}
        </div>
      )}

      {track.status === "failed" && track.error_message && (
        <div className="mt-1 flex items-start gap-1.5 text-xs text-rose-400 bg-rose-950/20 px-2 py-1.5 rounded-md border border-rose-900/30 font-mono">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="break-all">{mapBackendMessage(track.error_message)}</span>
        </div>
      )}
    </div>
  );
});
