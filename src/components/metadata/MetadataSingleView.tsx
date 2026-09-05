import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { AudioMetadata } from "../../types/download";

interface MetadataSingleViewProps {
  filePath: string;
  metadata: AudioMetadata;
  onChange: (field: keyof AudioMetadata, value: any) => void;
  onSelectCover: () => void;
  onAddCustomTag: () => void;
  onRemoveCustomTag: (key: string) => void;
}

export function MetadataSingleView({
  filePath,
  metadata,
  onChange,
  onSelectCover,
  onAddCustomTag,
  onRemoveCustomTag,
}: MetadataSingleViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* Cover Art Section */}
      <div className="flex flex-col gap-4">
        <div 
          className="aspect-square bg-neutral-900 border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center overflow-hidden group relative hover:border-rose-500/50 transition-colors cursor-pointer"
          onClick={onSelectCover}
        >
          {metadata.cover_art_base64 ? (
            <>
              <img 
                src={metadata.cover_art_base64} 
                alt="Cover" 
                className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium">변경하기</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-neutral-500 group-hover:text-rose-400 transition-colors">
              <ImageIcon className="w-12 h-12" />
              <span className="text-sm font-medium">커버 이미지 추가</span>
            </div>
          )}
        </div>
        <p className="text-xs text-neutral-500 text-center break-all px-2">
          {filePath}
        </p>
      </div>

      {/* Fields Section */}
      <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-400 ml-1">제목</label>
            <input
              type="text"
              value={metadata.title || ""}
              onChange={(e) => onChange("title", e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
              placeholder="제목을 입력하세요"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-400 ml-1">아티스트</label>
            <input
              type="text"
              value={metadata.artist || ""}
              onChange={(e) => onChange("artist", e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
              placeholder="아티스트를 입력하세요"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-400 ml-1">앨범</label>
          <input
            type="text"
            value={metadata.album || ""}
            onChange={(e) => onChange("album", e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
            placeholder="앨범을 입력하세요"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-400 ml-1">가사</label>
          <textarea
            value={metadata.lyrics || ""}
            onChange={(e) => onChange("lyrics", e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all h-32 resize-none custom-scrollbar"
            placeholder="가사를 입력하세요"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-400 ml-1">코멘트</label>
          <textarea
            value={metadata.comment || ""}
            onChange={(e) => onChange("comment", e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all h-20 resize-none custom-scrollbar"
            placeholder="코멘트 (Description)"
          />
        </div>

        {/* Custom Tags */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-400 ml-1">사용자 정의 태그</label>
            <button
              onClick={onAddCustomTag}
              className="text-xs flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors px-2 py-1 bg-rose-500/10 rounded-lg"
            >
              <Plus className="w-3 h-3" /> 태그 추가
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            {metadata.custom_tags && Object.entries(metadata.custom_tags).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-1/3 min-w-[100px] bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300 truncate">
                  {key}
                </div>
                <input
                  type="text"
                  value={value as string}
                  onChange={(e) => {
                    const newTags = { ...metadata.custom_tags, [key]: e.target.value };
                    onChange("custom_tags", newTags);
                  }}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50 transition-all"
                  placeholder={`${key} 값`}
                />
                <button
                  onClick={() => onRemoveCustomTag(key)}
                  className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(!metadata.custom_tags || Object.keys(metadata.custom_tags).length === 0) && (
              <div className="text-sm text-neutral-600 bg-neutral-900/50 rounded-xl p-4 text-center border border-dashed border-neutral-800">
                추가된 사용자 정의 태그가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
