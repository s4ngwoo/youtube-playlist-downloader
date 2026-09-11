import { useState, useCallback, useMemo } from "react";
import { X, CheckSquare, Square, Download, AlertTriangle } from "lucide-react";
import { TrackMetadata, SkippedTrack } from "../types/download";
import { TrackSelectionItem } from "./TrackSelectionItem";
import { summarizeSkippedTracks } from "../lib/skippedTracks";
import { useI18n } from "../i18n";

interface TrackSelectionModalProps {
  isOpen: boolean;
  playlistTitle: string;
  tracks: TrackMetadata[];
  skipped?: SkippedTrack[];
  onClose: () => void;
  onDownloadSelected: (selectedIndices: number[]) => void;
}

export function TrackSelectionModal(props: TrackSelectionModalProps) {
  if (!props.isOpen) return null;
  const selectionKey = props.tracks.map((tr) => tr.index).join(",");
  return <TrackSelectionModalBody key={selectionKey} {...props} />;
}

function TrackSelectionModalBody({
  playlistTitle,
  tracks,
  skipped = [],
  onClose,
  onDownloadSelected,
}: TrackSelectionModalProps) {
  const { t } = useI18n();
  const [selectedIndices, setSelectedIndices] = useState(
    () => new Set(tracks.map((tr) => tr.index)),
  );

  const skippedSummary = useMemo(() => {
    return summarizeSkippedTracks(
      skipped.map((s) => ({
        index: s.index,
        title: s.title,
        reason:
          s.reason === "private" || s.reason === "deleted" || s.reason === "unknown"
            ? s.reason
            : "unknown",
      })),
    );
  }, [skipped]);

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === tracks.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(tracks.map((tr) => tr.index)));
    }
  };

  const handleToggleTrack = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const reasonLabel = (reason: string) => {
    if (reason === "private") return t("select.skip.private");
    if (reason === "deleted") return t("select.skip.deleted");
    return t("select.skip.unknown");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/80">
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            {t("select.title")}
            <span className="text-xs font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
              {t("select.trackCount", { count: tracks.length })}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-neutral-950/50 border-b border-neutral-800/50">
          <p className="text-sm text-neutral-400">{t("select.labelTitle")}</p>
          <p className="font-medium text-neutral-200 truncate">{playlistTitle}</p>
        </div>

        {skippedSummary.total > 0 && (
          <div className="px-5 py-3 border-b border-amber-900/40 bg-amber-950/20 text-xs text-amber-200/90 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex flex-col gap-1 min-w-0">
              <p className="font-medium">
                {t("select.skippedSummary", { count: skippedSummary.total })}
              </p>
              <p className="text-amber-200/70">
                {t("select.skippedBreakdown", {
                  private: skippedSummary.privateCount,
                  deleted: skippedSummary.deletedCount,
                  unknown: skippedSummary.unknownCount,
                })}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800/50 bg-neutral-900">
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            {selectedIndices.size === tracks.length && tracks.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-rose-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {t("select.selectAll")}
          </button>
          <span className="text-sm text-neutral-400">
            {t("select.selectedCount", { count: selectedIndices.size })}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {tracks.map((track) => (
            <TrackSelectionItem
              key={track.index}
              track={track}
              isSelected={selectedIndices.has(track.index)}
              onToggle={handleToggleTrack}
            />
          ))}

          {skipped.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-800/80">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                {t("select.skippedSection")}
              </p>
              {skipped.map((item) => (
                <div
                  key={`skip-${item.index}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800/60 bg-neutral-950/40 opacity-80"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500/80 shrink-0" />
                  <span className="text-xs font-mono text-neutral-500 w-6 shrink-0">
                    {item.index.toString().padStart(2, "0")}
                  </span>
                  <span className="text-sm truncate flex-1 text-neutral-400">{item.title}</span>
                  <span className="text-[10px] font-semibold text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md shrink-0">
                    {reasonLabel(item.reason)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            {t("select.cancel")}
          </button>
          <button
            onClick={() => onDownloadSelected(Array.from(selectedIndices).sort((a, b) => a - b))}
            disabled={selectedIndices.size === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg shadow-rose-600/20"
          >
            <Download className="w-4 h-4" />
            {t("select.download", { count: selectedIndices.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
