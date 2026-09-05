import { useState, useEffect } from "react";
import { X, Save, FolderOpen, Music, Loader2, ArrowLeft } from "lucide-react";
import { useMetadata } from "../../hooks/useMetadata";
import { MetadataGridView } from "./MetadataGridView";
import { MetadataSingleView } from "./MetadataSingleView";
import { AudioFileEntry, AudioMetadata } from "../../types/download";

interface MetadataEditorModalProps {
  onClose: () => void;
  downloadDir?: string;
}

export function MetadataEditorModal({ onClose, downloadDir }: MetadataEditorModalProps) {
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [activeFile, setActiveFile] = useState<string>("");
  const [activeMetadata, setActiveMetadata] = useState<AudioMetadata>({});
  
  const {
    fileList,
    modifiedFiles,
    isLoading,
    isSaving,
    loadDirectory,
    loadMetadata,
    selectAudioFile,
    selectCoverImage,
    updateFileInGrid,
    saveAllMetadata,
    saveSingleMetadata,
  } = useMetadata();

  useEffect(() => {
    if (downloadDir) {
      loadDirectory(downloadDir);
    }
  }, [downloadDir, loadDirectory]);

  const handleSelectAudio = async () => {
    const selected = await selectAudioFile();
    if (selected) {
      setActiveFile(selected);
      const data = await loadMetadata(selected);
      setActiveMetadata(data);
      setViewMode("single");
    }
  };

  const handleEditSingle = (file: AudioFileEntry) => {
    setActiveFile(file.file_path);
    setActiveMetadata(file.metadata);
    setViewMode("single");
  };

  const handleSaveAll = async () => {
    await saveAllMetadata();
    alert("모든 변경사항이 저장되었습니다!");
  };

  const handleSaveSingle = async () => {
    if (!activeFile) return;
    await saveSingleMetadata(activeFile, activeMetadata);
    alert("메타데이터가 성공적으로 저장되었습니다!");
    setViewMode("grid");
  };

  const handleSingleMetadataChange = (field: keyof AudioMetadata, value: any) => {
    setActiveMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectCover = async () => {
    const coverStr = await selectCoverImage();
    if (coverStr) {
      handleSingleMetadataChange("cover_art_base64", coverStr);
    }
  };

  const handleAddCustomTag = () => {
    const keyName = prompt("추가할 필드 이름을 입력하세요 (예: Genre, Composer):");
    if (keyName && keyName.trim() !== "") {
      setActiveMetadata(prev => ({
        ...prev,
        custom_tags: {
          ...(prev.custom_tags || {}),
          [keyName.trim()]: ""
        }
      }));
    }
  };

  const handleRemoveCustomTag = (key: string) => {
    setActiveMetadata(prev => {
      const tags = { ...(prev.custom_tags || {}) };
      delete tags[key];
      return { ...prev, custom_tags: tags };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-text">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            {viewMode === "single" && fileList.length > 0 && (
              <button
                onClick={() => setViewMode("grid")}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors mr-2"
                title="목록으로 돌아가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Music className="w-5 h-5 text-rose-500" />
            </div>
            <h2 className="text-lg font-bold text-white">
              메타데이터 에디터 {viewMode === "grid" ? "(일괄 편집)" : "(상세 편집)"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1 custom-scrollbar">
          {viewMode === "grid" ? (
            <>
              <div className="flex justify-between items-center">
                <button
                  onClick={handleSelectAudio}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center gap-2 transition-colors shrink-0 text-sm font-medium"
                >
                  <FolderOpen className="w-4 h-4" />
                  개별 파일 열기
                </button>
                <span className="text-sm text-neutral-400">
                  {downloadDir ? `디렉토리: ${downloadDir}` : ""}
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                </div>
              ) : fileList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-2">
                  <Music className="w-12 h-12 mb-2 opacity-20" />
                  <p>이 디렉토리에 오디오 파일이 없습니다.</p>
                  <p className="text-sm">직접 개별 파일을 열어주세요.</p>
                </div>
              ) : (
                <MetadataGridView 
                  fileList={fileList}
                  modifiedFiles={modifiedFiles}
                  onGridChange={updateFileInGrid}
                  onEditSingle={handleEditSingle}
                />
              )}
            </>
          ) : (
            <MetadataSingleView
              filePath={activeFile}
              metadata={activeMetadata}
              onChange={handleSingleMetadataChange}
              onSelectCover={handleSelectCover}
              onAddCustomTag={handleAddCustomTag}
              onRemoveCustomTag={handleRemoveCustomTag}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium transition-all text-neutral-300 hover:bg-neutral-800"
          >
            취소
          </button>
          
          {viewMode === "grid" ? (
            <button
              onClick={handleSaveAll}
              disabled={modifiedFiles.size === 0 || isSaving}
              className="px-5 py-2.5 rounded-xl font-medium transition-all bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {modifiedFiles.size > 0 ? `${modifiedFiles.size}개 일괄 저장` : "저장할 내용 없음"}
            </button>
          ) : (
            <button
              onClick={handleSaveSingle}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-medium transition-all bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
