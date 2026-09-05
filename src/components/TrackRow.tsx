import React from "react";
import {
  CheckCircle2,
  Sparkles,
  Music2,
  Download,
  AlertCircle,
} from "lucide-react";
import { TrackItem as TrackItemType } from "../types/download";

interface TrackRowProps {
  track: TrackItemType;
  viewMode: "basic" | "advanced";
}

export const TrackRow = React.memo(function TrackRow({
  track,
  viewMode,
}: TrackRowProps) {
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
        {/* 트랙 번호 & 제목 */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
            {track.index.toString().padStart(2, "0")}
          </span>
          <span className="text-sm font-medium text-neutral-200 truncate">
            {track.title}
          </span>
        </div>

        {/* 트랙 상태 뱃지 */}
        <div className="flex items-center gap-2 shrink-0">
          {viewMode === "basic" ? (
            // === 기본 모드 (Basic Mode) ===
            <>
              {track.status === "completed" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  다운로드 완료
                </span>
              )}
              {(track.status === "tagging" ||
                track.status === "converting_art" ||
                track.status === "extracting") && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/50 px-2 py-0.5 rounded-md animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  파일 최적화 및 저장 중...
                </span>
              )}
              {track.status === "downloading" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-950/40 border border-blue-800/50 px-2 py-0.5 rounded-md">
                  <Download className="w-3 h-3 animate-bounce" />
                  다운로드 중 ({track.progress.toFixed(0)}%)
                </span>
              )}
              {track.status === "failed" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3 h-3" />
                  다운로드 실패
                </span>
              )}
              {track.status === "pending" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md">
                  대기 중
                </span>
              )}
            </>
          ) : (
            // === 고급 모드 (Advanced Mode) ===
            <>
              {track.status === "completed" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-md font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              )}
              {track.status === "tagging" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-md font-mono">
                  <Sparkles className="w-3 h-3" />
                  Embedding Metadata
                </span>
              )}
              {track.status === "converting_art" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md font-mono">
                  <Sparkles className="w-3 h-3" />
                  Converting Thumbnail
                </span>
              )}
              {track.status === "extracting" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/50 px-2 py-0.5 rounded-md font-mono">
                  <Music2 className="w-3 h-3" />
                  Extracting Audio
                </span>
              )}
              {track.status === "downloading" && (
                <div className="flex items-center gap-2">
                  {track.speed && track.eta && (
                    <span className="text-[10px] text-neutral-400 font-mono tracking-tighter">
                      {track.speed} | ETA: {track.eta}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-950/40 border border-blue-800/50 px-2 py-0.5 rounded-md font-mono">
                    <Download className="w-3 h-3 animate-bounce" />
                    {track.progress.toFixed(1)}%
                  </span>
                </div>
              )}
              {track.status === "failed" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-md font-mono">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </span>
              )}
              {track.status === "pending" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md font-mono">
                  Pending in Queue
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 트랙 개별 진행률 바 (진행 중일 때만 표시) */}
      {(track.status === "downloading" ||
        track.status === "extracting" ||
        track.status === "converting_art" ||
        track.status === "tagging") && (
        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500 rounded-full transition-all duration-150"
            style={{ width: `${track.progress}%` }}
          />
        </div>
      )}

      {/* 실패 시 에러 메시지 노출 */}
      {track.status === "failed" && track.error_message && (
        <div className="mt-1 flex items-start gap-1.5 text-xs text-rose-400 bg-rose-950/20 px-2 py-1.5 rounded-md border border-rose-900/30 font-mono">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="break-all">{track.error_message}</span>
        </div>
      )}
    </div>
  );
});
