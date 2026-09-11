import { Edit3, CheckCircle2 } from "lucide-react";
import { useI18n } from "../../i18n";
import { AudioFileEntry, AudioMetadata } from "../../types/download";

interface MetadataGridViewProps {
  fileList: AudioFileEntry[];
  modifiedFiles: Set<string>;
  onGridChange: (path: string, field: keyof AudioMetadata, value: string) => void;
  onEditSingle: (file: AudioFileEntry) => void;
}

export function MetadataGridView({
  fileList,
  modifiedFiles,
  onGridChange,
  onEditSingle,
}: MetadataGridViewProps) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-950 custom-scrollbar">
      <table className="w-full text-left text-sm text-neutral-300">
        <thead className="bg-neutral-900 text-neutral-400 font-medium">
          <tr>
            <th className="px-4 py-3 border-b border-neutral-800 truncate max-w-[200px]">
              {t("meta.col.file")}
            </th>
            <th className="px-4 py-3 border-b border-neutral-800 min-w-[150px]">
              {t("meta.col.title")}
            </th>
            <th className="px-4 py-3 border-b border-neutral-800 min-w-[120px]">
              {t("meta.col.artist")}
            </th>
            <th className="px-4 py-3 border-b border-neutral-800 min-w-[120px]">
              {t("meta.col.album")}
            </th>
            <th className="px-4 py-3 border-b border-neutral-800 w-24 text-center">
              {t("meta.col.status")}
            </th>
            <th className="px-4 py-3 border-b border-neutral-800 w-24 text-center">
              {t("meta.col.edit")}
            </th>
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
                    placeholder={t("meta.ph.titleShort")}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={file.metadata.artist || ""}
                    onChange={(e) => onGridChange(file.file_path, "artist", e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:border-rose-500/50 rounded px-2 py-1 outline-none transition-colors"
                    placeholder={t("meta.ph.artistShort")}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={file.metadata.album || ""}
                    onChange={(e) => onGridChange(file.file_path, "album", e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-neutral-700 focus:border-rose-500/50 rounded px-2 py-1 outline-none transition-colors"
                    placeholder={t("meta.ph.albumShort")}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  {isModified ? (
                    <span className="text-amber-500 text-xs font-medium flex items-center justify-center gap-1">
                      <Edit3 className="w-3 h-3" /> {t("meta.status.modified")}
                    </span>
                  ) : (
                    <span className="text-neutral-500 text-xs flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {t("meta.status.original")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onEditSingle(file)}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors"
                  >
                    {t("meta.detail")}
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
