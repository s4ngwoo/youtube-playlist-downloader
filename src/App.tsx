import { useRef, useState } from "react";
import { useDownloader } from "./hooks/useDownloader";
import { useDynamicWindowResize } from "./hooks/useDynamicWindowResize";
import { Header } from "./components/Header";
import { DownloadForm } from "./components/DownloadForm";
import { TrackList } from "./components/TrackList";
import { TerminalLog } from "./components/TerminalLog";
import { Footer } from "./components/Footer";
import { MetadataEditorModal } from "./components/metadata/MetadataEditorModal";
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
    handleStartDownload,
    handleCancelDownload,
    handleCreateZip,
    handleRetryFailedDownloads,
    failedCount,
  } = useDownloader();

  // 동적 윈도우 리사이징 활성화 (트랙 수 변화, 콘솔 접기/펼치기, 다운로드 상태 전환 시 자동 반응)
  useDynamicWindowResize(
    contentRef,
    [trackList.length, isConsoleCollapsed, status],
    { padding: 68 }
  );

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

          <main className="w-full max-w-5xl flex flex-col gap-5">
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
              onSelectFolder={handleSelectFolder}
              onStartDownload={handleStartDownload}
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
          </main>

          <Footer />
        </div>
      </div>

      {isMetadataEditorOpen && (
        <MetadataEditorModal onClose={() => setIsMetadataEditorOpen(false)} downloadDir={downloadDir} />
      )}
    </>
  );
}
