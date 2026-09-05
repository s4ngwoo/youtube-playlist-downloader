import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PlaylistMetadata } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";

export function useDownloadActions() {
  const store = useDownloadStore();

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [fetchedPlaylist, setFetchedPlaylist] = useState<PlaylistMetadata | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // 1. 다운로드 저장 폴더 선택 다이얼로그 핸들러
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: store.downloadDir || undefined,
        title: "오디오 저장 폴더 선택",
      });
      if (selected && typeof selected === "string") {
        store.setDownloadDir(selected);
        localStorage.setItem("yt_download_dir", selected);
      }
    } catch (err) {
      console.error("폴더 선택 다이얼로그 오류:", err);
    }
  };

  // 2. 다운로드 시작 대신 메타데이터 가져오기 핸들러 (모달 띄우기)
  const handleFetchMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = store.url.trim();

    if (!targetUrl) {
      alert("다운로드할 YouTube 링크 또는 플레이리스트 URL을 입력해 주세요.");
      return;
    }

    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const storePl = await load("history.json");
      const hasDownloaded = await storePl.get(targetUrl);
      
      if (hasDownloaded) {
        const confirmResult = window.confirm("이미 다운로드한 기록이 있습니다. 다시 다운로드 하시겠습니까?");
        if (!confirmResult) {
          return;
        }
      }
    } catch (err) {
      console.warn("히스토리 확인 실패:", err);
    }

    setIsFetchingMetadata(true);
    store.setStatusMessage("플레이리스트 정보를 불러오는 중...");

    try {
      const metadata = await invoke<PlaylistMetadata>("fetch_metadata", {
        url: targetUrl,
      });
      setFetchedPlaylist(metadata);
      setIsSelectionModalOpen(true);
      store.setStatusMessage("다운로드할 항목을 선택해 주세요.");
    } catch (err: unknown) {
      console.error("메타데이터 가져오기 실패:", err);
      const errorMessage = typeof err === "string" ? err : String(err);
      store.setStatusMessage(`정보 불러오기 실패: ${errorMessage}`);
      alert(`정보 불러오기 실패: ${errorMessage}`);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // 3. 모달에서 선택한 항목들만 다운로드 시작
  const handleDownloadSelected = async (selectedIndices: number[]) => {
    setIsSelectionModalOpen(false);
    const targetUrl = store.url.trim();
    store.resetState();

    try {
      const result = await invoke<string>("download_audio", {
        url: targetUrl,
        downloadDir: store.downloadDir || null,
        playlistItems: selectedIndices.join(","),
      });
      store.setStatus("completed");
      store.setStatusMessage(result || "모든 다운로드가 성공적으로 완료되었습니다!");
      
      try {
        const { load } = await import("@tauri-apps/plugin-store");
        const storePl = await load("history.json");
        await storePl.set(targetUrl, { 
          url: targetUrl, 
          title: store.playlistTitle || "Unknown Title",
          date: new Date().toISOString() 
        });
        await storePl.save();
      } catch (err) {
        console.warn("히스토리 저장 실패:", err);
      }
    } catch (err: unknown) {
      console.error("다운로드 에러:", err);
      store.setStatus("error");
      const errorMessage = typeof err === "string" ? err : String(err);
      store.setStatusMessage(`오류 발생: ${errorMessage}`);
    }
  };

  // 4. 다운로드 취소 핸들러
  const handleCancelDownload = async () => {
    try {
      store.setStatusMessage("다운로드를 취소하고 백엔드 프로세스를 종료 중...");
      const msg = await invoke<string>("cancel_download");
      store.setStatus("cancelled");
      store.setStatusMessage(msg || "다운로드가 중단되었습니다.");
      store.setCurrentSpeed("");
      store.setCurrentEta("");
    } catch (err) {
      console.error("취소 처리 실패:", err);
    }
  };

  // 5. 모바일 호환 ZIP 압축 핸들러
  const handleCreateZip = async () => {
    if (!store.downloadDir) {
      alert("다운로드 폴더가 설정되지 않았습니다.");
      return;
    }
    store.setIsZipping(true);
    store.setStatusMessage("모바일 호환 ZIP 압축 파일 생성 중...");
    try {
      const result = await invoke<string>("create_mobile_zip", {
        downloadDir: store.downloadDir,
      });
      alert(result);
      store.setStatusMessage("ZIP 압축 완료");
    } catch (err: unknown) {
      console.error("ZIP 생성 에러:", err);
      const errorMessage = typeof err === "string" ? err : String(err);
      alert(`ZIP 압축 실패: ${errorMessage}`);
      store.setStatusMessage(`오류 발생: ${errorMessage}`);
    } finally {
      store.setIsZipping(false);
    }
  };

  // 6. 실패한 다운로드 재시도 핸들러
  const handleRetryFailedDownloads = async (failedIndices: string, failedCount: number) => {
    const targetUrl = store.url.trim();

    store.setStatus("downloading");
    store.setStatusMessage(`실패한 항목 (${failedCount}개) 재다운로드 중...`);

    // 기존 트랙 상태를 pending으로 초기화 (호출하는 측에서 indices를 알고 있음)
    // 여기서는 실패했던 것만 다시 시도. Zustand store 직접 갱신.
    store.setTracks((prev) => {
      const next = new Map(prev);
      const indicesArr = failedIndices.split(',').map(Number);
      indicesArr.forEach((idx) => {
        const item = next.get(idx);
        if (item) {
          next.set(idx, { ...item, status: "pending", error_message: undefined, progress: 0 });
        }
      });
      return next;
    });

    try {
      const result = await invoke<string>("download_audio", {
        url: targetUrl,
        downloadDir: store.downloadDir || null,
        playlistItems: failedIndices,
      });
      store.setStatus("completed");
      store.setStatusMessage(result || "재다운로드가 성공적으로 완료되었습니다!");
    } catch (err: unknown) {
      console.error("재다운로드 에러:", err);
      store.setStatus("error");
      const errorMessage = typeof err === "string" ? err : String(err);
      store.setStatusMessage(`오류 발생: ${errorMessage}`);
    }
  };

  return {
    isSelectionModalOpen,
    setIsSelectionModalOpen,
    fetchedPlaylist,
    isFetchingMetadata,
    handleSelectFolder,
    handleFetchMetadata,
    handleDownloadSelected,
    handleCancelDownload,
    handleCreateZip,
    handleRetryFailedDownloads,
  };
}
