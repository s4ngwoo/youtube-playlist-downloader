import React from "react";
import { CheckSquare, Square } from "lucide-react";
import { TrackMetadata } from "../types/download";

interface TrackSelectionItemProps {
  track: TrackMetadata;
  isSelected: boolean;
  onToggle: (index: number) => void;
}

export const TrackSelectionItem = React.memo(function TrackSelectionItem({
  track,
  isSelected,
  onToggle,
}: TrackSelectionItemProps) {
  return (
    <div
      onClick={() => onToggle(track.index)}
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
      <span
        className={`text-sm truncate flex-1 ${
          isSelected ? "text-rose-100" : "text-neutral-300"
        }`}
      >
        {track.title}
      </span>
    </div>
  );
});
