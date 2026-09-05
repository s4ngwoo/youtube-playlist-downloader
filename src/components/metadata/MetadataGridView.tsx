import { Edit3, CheckCircle2 } from "lucide-react";
import { AudioFileEntry, AudioMetadata } from "../../types/download";

interface MetadataGridViewProps {
  fileList: AudioFileEntry[];
  modifiedFiles: Set<string>;
  onGridChange: (path: string, field: keyof AudioMetadata, value: string) => void;
  onEditSingle: (file: AudioFileEntry) => void;
}

export function MetadataGridView({ fileList, modifiedFiles, onGridChange, onEditSingle }: MetadataGridViewProps) {
  return (
    <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-950 custom-scrollbar">
      <table className="w-full text-left text-sm text-neutral-300">
        <thead className="bg-neutral-900 text-neutral-400 font-medium">
          <tr>
            <th className="px-4 py-3 border-b border-neutral-800 truncate max-w-[200px]">파일명</th>
            <th className="px-4 py-3 border-b border-neutral-800 min-w-[150px]">제목</th>
            <th className="px-4 py-3 border-b border-neutral-800 min-w-[120px]">아티스트</th>
            <th className="px-4 py-3 border-b border-neutral-800 min-w-[120px]">앨범</th>
            <th className="px-4 py-3 border-b border-neutral-800 w-24 text-center">상태</th>
            <th className="px-4 py-3 border-b border-neutral-800 w-24 text-center">편집</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/50">
          {fileList.map((file) => {
            const isModified = modifiedFiles.has(file.file_path);
            return (
              <tr key={file.file_path} className="hover:bg-neutral-900/50 transition-colors">
                <td className="px-4 py-3 truncate max-w-[200px]" title={file.file_name}>
                  {file.file_name}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={file.metadata.title || ""}
                    onChange={(e) => onGridChange(file.file_path, "title", e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:border-rose-500/50 rounded px-2 py-1 outline-none transition-colors"
                    placeholder="제목"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={file.metadata.artist || ""}
                    onChange={(e) => onGridChange(file.file_path, "artist", e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:border-rose-500/50 rounded px-2 py-1 outline-none transition-colors"
                    placeholder="아티스트"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={file.metadata.album || ""}
                    onChange={(e) => onGridChange(file.file_path, "album", e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:border-rose-500/50 rounded px-2 py-1 outline-none transition-colors"
                    placeholder="앨범"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  {isModified ? (
                    <span className="text-amber-500 text-xs font-medium flex items-center justify-center gap-1">
                      <Edit3 className="w-3 h-3" /> 수정됨
                    </span>
                  ) : (
                    <span className="text-neutral-500 text-xs flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 원본
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onEditSingle(file)}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors"
                  >
                    상세
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
