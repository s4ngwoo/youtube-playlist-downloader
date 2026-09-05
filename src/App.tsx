import { useRef, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Header } from "./components/Header";
import { DownloadForm } from "./components/DownloadForm";
import { TrackList } from "./components/TrackList";
import { TerminalLog } from "./components/TerminalLog";
import { Footer } from "./components/Footer";
import { MetadataEditorModal } from "./components/metadata/MetadataEditorModal";
import { TrackSelectionModal } from "./components/TrackSelectionModal";
import { HistoryTab } from "./components/HistoryTab";
import { useDownloadStore } from "./store/downloadStore";
import { useDownloadEvents } from "./hooks/useDownloadEvents";
import { useDownloadActions } from "./hooks/useDownloadActions";
import "./App.css";

export default function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"download" | "history">("download");

  // 1. Initialize Events Listener
  useDownloadEvents();

  // 2. Fetch Store States
  const { setUrl, downloadDir } = useDownloadStore();

  // 3. Actions
  const { 
    isSelectionModalOpen, 
    setIsSelectionModalOpen, 
    fetchedPlaylist, 
    handleDownloadSelected 
  } = useDownloadActions();

  // 4. Init Default Directory (Run once)
  useEffect(() => {
    const saved = localStorage.getItem("yt_download_dir");
    if (saved) {
      useDownloadStore.getState().setDownloadDir(saved);
    } else {
      invoke<string>("get_default_download_dir")
        .then((dir) => {
          if (dir) {
            useDownloadStore.getState().setDownloadDir(dir);
            localStorage.setItem("yt_download_dir", dir);
          }
        })
        .catch((err) => console.error("기본 저장 폴더 조회 실패:", err));
    }
  }, []);

  const handleLoadUrlFromHistory = (historyUrl: string) => {
    setUrl(historyUrl);
    setActiveTab("download");
  };

  return (
    <>
      <div
        data-tauri-drag-region
        className="h-screen w-full bg-neutral-950 text-neutral-100 px-4 pb-6 pt-9 sm:px-6 sm:pb-8 sm:pt-11 selection:bg-rose-600 selection:text-white overflow-y-auto custom-scrollbar cursor-default"
      >
        <div
          ref={contentRef}
          className="w-full max-w-5xl mx-auto flex flex-col gap-5"
        >
          <Header onOpenMetadataEditor={() => setIsMetadataEditorOpen(true)} />

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
                <DownloadForm />
                <TrackList />
                <TerminalLog />
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
