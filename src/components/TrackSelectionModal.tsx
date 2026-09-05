import { useState, useEffect } from "react";
import { X, CheckSquare, Square, Download } from "lucide-react";
import { TrackMetadata } from "../types/download";

interface TrackSelectionModalProps {
  isOpen: boolean;
  playlistTitle: string;
  tracks: TrackMetadata[];
  onClose: () => void;
  onDownloadSelected: (selectedIndices: number[]) => void;
}

export function TrackSelectionModal({
  isOpen,
  playlistTitle,
  tracks,
  onClose,
  onDownloadSelected,
}: TrackSelectionModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 모달이 열릴 때 모든 트랙을 기본적으로 선택 상태로 만듦
  useEffect(() => {
    if (isOpen) {
      setSelectedIndices(new Set(tracks.map((t) => t.index)));
    }
  }, [isOpen, tracks]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === tracks.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(tracks.map((t) => t.index)));
    }
  };

  const handleToggleTrack = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/80">
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            플레이리스트 다운로드 선택
            <span className="text-xs font-normal text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
              {tracks.length}곡
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playlist Title */}
        <div className="px-5 py-3 bg-neutral-950/50 border-b border-neutral-800/50">
          <p className="text-sm text-neutral-400">제목</p>
          <p className="font-medium text-neutral-200 truncate">{playlistTitle}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800/50 bg-neutral-900">
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            {selectedIndices.size === tracks.length ? (
              <CheckSquare className="w-4 h-4 text-rose-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            전체 선택
          </button>
          <span className="text-sm text-neutral-400">
            {selectedIndices.size}개 선택됨
          </span>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-2">
          {tracks.map((track) => {
            const isSelected = selectedIndices.has(track.index);
            return (
              <div
                key={track.index}
                onClick={() => handleToggleTrack(track.index)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-rose-500/10 border border-rose-500/20"
                    : "hover:bg-neutral-800 border border-transparent"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-500 shrink-0" />
                )}
                <span className="text-xs font-mono text-neutral-500 w-6 shrink-0">
                  {track.index.toString().padStart(2, "0")}
                </span>
                <span className={`text-sm truncate flex-1 ${isSelected ? "text-rose-100" : "text-neutral-300"}`}>
                  {track.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onDownloadSelected(Array.from(selectedIndices).sort((a, b) => a - b))}
            disabled={selectedIndices.size === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg shadow-rose-600/20"
          >
            <Download className="w-4 h-4" />
            {selectedIndices.size}곡 다운로드 시작
          </button>
        </div>
      </div>
    </div>
  );
}
