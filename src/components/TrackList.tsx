import {
  ListOrdered,
  Disc3,
  CheckCircle2,
  Sparkles,
  Music2,
  Download,
  AlertCircle,
} from "lucide-react";
import { TrackItem } from "../types/download";

interface TrackListProps {
  playlistTitle: string;
  totalItems: number;
  trackList: TrackItem[];
}

export function TrackList({
  playlistTitle,
  totalItems,
  trackList,
}: TrackListProps) {
  return (
    <section className="bg-neutral-900/70 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-5 py-3.5 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListOrdered className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            트랙별 진행 상태
          </h2>
          {playlistTitle && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950/50 text-rose-300 border border-rose-800/40 font-medium truncate max-w-md">
              {playlistTitle}
            </span>
          )}
        </div>

        <span className="text-xs font-mono text-neutral-400">
          {totalItems > 0
            ? `총 ${totalItems}개 트랙 중 ${trackList.length}개 탐색됨`
            : "트랙 없음"}
        </span>
      </div>

      {/* 트랙 목록 컨테이너 */}
      <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        {trackList.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-neutral-600 gap-2 text-center">
            <Disc3 className="w-8 h-8 opacity-40 animate-[spin_8s_linear_infinite]" />
            <p className="text-xs text-neutral-500">
              플레이리스트 URL을 입력하고 다운로드를 시작하면 트랙별 상태가 실시간으로 표시됩니다.
            </p>
          </div>
        ) : (
          trackList.map((track) => (
            <div
              key={track.index}
              className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                track.status === "downloading"
                  ? "bg-neutral-900 border-rose-500/40 shadow-sm"
                  : track.status === "completed"
                  ? "bg-neutral-950/60 border-neutral-800/80 opacity-90"
                  : track.status === "extracting"
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
                  {track.status === "completed" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      완료 (m4a + 앨범아트)
                    </span>
                  )}
                  {track.status === "tagging" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-md animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      앨범아트 & 메타데이터 삽입 중
                    </span>
                  )}
                  {track.status === "converting_art" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      썸네일 JPG 변환 중
                    </span>
                  )}
                  {track.status === "extracting" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/50 px-2 py-0.5 rounded-md animate-pulse">
                      <Music2 className="w-3 h-3" />
                      m4a 오디오 변환 중
                    </span>
                  )}
                  {track.status === "downloading" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-950/40 border border-blue-800/50 px-2 py-0.5 rounded-md font-mono">
                      <Download className="w-3 h-3 animate-bounce" />
                      {track.progress.toFixed(1)}%
                    </span>
                  )}
                  {track.status === "failed" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-md">
                      <AlertCircle className="w-3 h-3" />
                      실패
                    </span>
                  )}
                  {track.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-md">
                      대기
                    </span>
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
            </div>
          ))
        )}
      </div>
    </section>
  );
}
