import React from "react";
import {
  Folder,
  FolderOpen,
  Square,
  Download,
  Sparkles,
  Clock,
  Archive,
} from "lucide-react";
import { DownloadStatus } from "../types/download";

interface DownloadFormProps {
  url: string;
  setUrl: (url: string) => void;
  downloadDir: string;
  status: DownloadStatus;
  statusMessage: string;
  totalItems: number;
  completedCount: number;
  overallPercent: number;
  currentSpeed: string;
  currentEta: string;
  isZipping: boolean;
  onSelectFolder: () => void;
  onStartDownload: (e?: React.FormEvent) => void;
  onCancelDownload: () => void;
  onCreateZip: () => void;
}

export function DownloadForm({
  url,
  setUrl,
  downloadDir,
  status,
  statusMessage,
  totalItems,
  completedCount,
  overallPercent,
  currentSpeed,
  currentEta,
  isZipping,
  onSelectFolder,
  onStartDownload,
  onCancelDownload,
  onCreateZip,
}: DownloadFormProps) {
  return (
    <section className="bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col gap-4">
      {/* 저장 경로 설정 GUI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <Folder className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="text-neutral-400 shrink-0 font-medium">저장 위치:</span>
            <span
              className="font-mono text-neutral-200 bg-neutral-950/80 border border-neutral-800 px-2.5 py-1 rounded-lg truncate max-w-xs sm:max-w-md md:max-w-lg"
              title={downloadDir}
            >
              {downloadDir || "기본 다운로드 폴더 로드 중..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={onCreateZip}
            disabled={status === "downloading" || isZipping || !downloadDir}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800/90 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700/70 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <Archive className={`w-3.5 h-3.5 text-blue-400 ${isZipping ? "animate-pulse" : ""}`} />
            {isZipping ? "압축 중..." : "모바일 호환 ZIP 압축"}
          </button>
          
          <button
            type="button"
            onClick={onSelectFolder}
            disabled={status === "downloading" || isZipping}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800/90 hover:bg-neutral-700/80 text-neutral-200 border border-neutral-700/70 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-rose-400" />
            폴더 변경
          </button>
        </div>
      </div>

      <form onSubmit={onStartDownload} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="유튜브 단일 영상 또는 재생목록(Playlist) URL을 입력하세요"
            disabled={status === "downloading"}
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
              취소 (Cancel)
            </button>
          ) : (
            <button
              type="submit"
              disabled={!url.trim()}
              className="h-12 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              <Download className="w-4 h-4" />
              다운로드 시작
            </button>
          )}
        </div>
      </form>

      {/* 전체 진행 현황 바 */}
      <div className="mt-5 pt-5 border-t border-neutral-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-neutral-300 flex items-center gap-2 truncate max-w-[70%]">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </span>
          <span className="font-mono text-neutral-200 font-semibold text-sm shrink-0">
            {totalItems > 0
              ? `${completedCount}/${totalItems}곡 완료 (${overallPercent.toFixed(1)}%)`
              : `${overallPercent.toFixed(1)}%`}
          </span>
        </div>

        {/* 전체 종합 게이지 바 */}
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

        {/* 부가 메트릭 (속도 및 ETA) */}
        {(currentSpeed || currentEta) && status === "downloading" && (
          <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono mt-0.5">
            {currentSpeed && (
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3 text-neutral-500" />
                속도: <span className="text-neutral-200">{currentSpeed}</span>
              </span>
            )}
            {currentEta && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                남은 시간: <span className="text-neutral-200">{currentEta}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
