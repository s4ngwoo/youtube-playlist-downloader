import { useState, useMemo } from "react";
import { ListOrdered, Disc3, AlertCircle } from "lucide-react";
import { useDownloadStore } from "../store/downloadStore";
import { useDownloadActions } from "../hooks/useDownloadActions";
import { TrackRow } from "./TrackRow";

export function TrackList() {
  const [viewMode, setViewMode] = useState<"basic" | "advanced">("basic");
  const { playlistTitle, totalItems, tracks } = useDownloadStore();
  const { handleRetryFailedDownloads } = useDownloadActions();

  const trackList = useMemo(() => {
    return Array.from(tracks.values()).sort((a, b) => a.index - b.index);
  }, [tracks]);

  const failedTracks = useMemo(() => trackList.filter((t) => t.status === "failed"), [trackList]);
  const failedCount = failedTracks.length;

  const onRetryFailed = () => {
    if (failedCount > 0) {
      handleRetryFailedDownloads(failedTracks.map((t) => t.index).join(","), failedCount);
    }
  };

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

        <div className="flex items-center gap-3">
          {/* 모드 토글 스위치 */}
          <div className="flex items-center bg-neutral-900 rounded-md border border-neutral-800 p-0.5">
            <button
              onClick={() => setViewMode("basic")}
              className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-colors ${
                viewMode === "basic"
                  ? "bg-neutral-800 text-neutral-200 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              기본 모드
            </button>
            <button
              onClick={() => setViewMode("advanced")}
              className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-colors ${
                viewMode === "advanced"
                  ? "bg-neutral-800 text-neutral-200 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              고급 모드
            </button>
          </div>

          {failedCount > 0 && onRetryFailed && (
            <button
              onClick={onRetryFailed}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-md transition-colors shadow-sm flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              실패한 {failedCount}개 재시도
            </button>
          )}
          <span className="text-xs font-mono text-neutral-400">
            {totalItems > 0
              ? `총 ${totalItems}개 트랙 중 ${trackList.length}개 탐색됨`
              : "트랙 없음"}
          </span>
        </div>
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
            <TrackRow key={track.index} track={track} viewMode={viewMode} />
          ))
        )}
      </div>
    </section>
  );
}
