import { useRef, useState } from "react";
import { useDownloader } from "./hooks/useDownloader";
import { Header } from "./components/Header";
import { DownloadForm } from "./components/DownloadForm";
import { TrackList } from "./components/TrackList";
import { TerminalLog } from "./components/TerminalLog";
import { Footer } from "./components/Footer";
import { MetadataEditorModal } from "./components/metadata/MetadataEditorModal";
import { TrackSelectionModal } from "./components/TrackSelectionModal";
import { HistoryTab } from "./components/HistoryTab";
import "./App.css";

export default function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);

  const {
    url,
    setUrl,
    downloadDir,
    status,
    statusMessage,
    playlistTitle,
    totalItems,
    trackList,
    completedCount,
    overallPercent,
    currentSpeed,
    currentEta,
    logs,
    setLogs,
    autoScroll,
    setAutoScroll,
    isConsoleCollapsed,
    setIsConsoleCollapsed,
    isZipping,
    handleSelectFolder,
    handleFetchMetadata,
    handleDownloadSelected,
    isFetchingMetadata,
    isSelectionModalOpen,
    setIsSelectionModalOpen,
    fetchedPlaylist,
    handleCancelDownload,
    handleCreateZip,
    handleRetryFailedDownloads,
    failedCount,
  } = useDownloader();

  const [activeTab, setActiveTab] = useState<"download" | "history">("download");

  const handleLoadUrlFromHistory = (historyUrl: string) => {
    setUrl(historyUrl);
    setActiveTab("download");
  };

  return (
    <>
      <div
        data-tauri-drag-region
        className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center px-4 pb-6 pt-9 sm:px-6 sm:pb-8 sm:pt-11 selection:bg-rose-600 selection:text-white overflow-y-auto custom-scrollbar cursor-default"
      >
        {/* 동적 윈도우 리사이징 감지용 내부 래퍼 */}
        <div
          ref={contentRef}
          className="w-full max-w-5xl flex flex-col items-center gap-5"
        >
          <Header status={status} onOpenMetadataEditor={() => setIsMetadataEditorOpen(true)} />

          <div className="w-full flex gap-2">
            <button 
              onClick={() => setActiveTab("download")} 
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'download' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'}`}
            >
              다운로드
            </button>
            <button 
              onClick={() => setActiveTab("history")} 
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'}`}
            >
              다운로드 기록
            </button>
          </div>

          <main className="w-full max-w-5xl flex flex-col gap-5">
            {activeTab === "download" ? (
              <>
                <DownloadForm
                  url={url}
                  setUrl={setUrl}
                  downloadDir={downloadDir}
                  status={status}
                  statusMessage={statusMessage}
                  totalItems={totalItems}
                  completedCount={completedCount}
                  overallPercent={overallPercent}
                  currentSpeed={currentSpeed}
                  currentEta={currentEta}
                  isZipping={isZipping}
                  isFetchingMetadata={isFetchingMetadata}
                  onSelectFolder={handleSelectFolder}
                  onFetchMetadata={handleFetchMetadata}
                  onCancelDownload={handleCancelDownload}
                  onCreateZip={handleCreateZip}
                />

                <TrackList
                  playlistTitle={playlistTitle}
                  totalItems={totalItems}
                  trackList={trackList}
                  failedCount={failedCount}
                  onRetryFailed={handleRetryFailedDownloads}
                />

                <TerminalLog
                  logs={logs}
                  autoScroll={autoScroll}
                  isConsoleCollapsed={isConsoleCollapsed}
                  onToggleAutoScroll={setAutoScroll}
                  onClearLogs={() => setLogs([])}
                  onToggleCollapse={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                />
              </>
            ) : (
              <HistoryTab onLoadUrl={handleLoadUrlFromHistory} />
            )}
          </main>

          <Footer />
        </div>
      </div>

      {isMetadataEditorOpen && (
        <MetadataEditorModal onClose={() => setIsMetadataEditorOpen(false)} downloadDir={downloadDir} />
      )}
      
      {fetchedPlaylist && (
        <TrackSelectionModal
          isOpen={isSelectionModalOpen}
          playlistTitle={fetchedPlaylist.title}
          tracks={fetchedPlaylist.tracks}
          onClose={() => setIsSelectionModalOpen(false)}
          onDownloadSelected={handleDownloadSelected}
        />
      )}
    </>
  );
}
