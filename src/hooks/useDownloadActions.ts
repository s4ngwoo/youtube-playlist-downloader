import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PlaylistMetadata } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";
import { historyService } from "../services/historyService";
import { settingsService } from "../services/settingsService";
import { AudioFormat, clampConcurrency } from "../types/settings";

export function useDownloadActions() {
  const store = useDownloadStore();

  const persistSettings = async (partial: {
    downloadDir?: string;
    concurrency?: number;
    audioFormat?: AudioFormat;
  }) => {
    const next = await settingsService.update({
      downloadDir: partial.downloadDir ?? store.downloadDir,
      concurrency: partial.concurrency ?? store.concurrency,
      audioFormat: partial.audioFormat ?? store.audioFormat,
    });
    store.setDownloadDir(next.downloadDir);
    store.setConcurrency(next.concurrency);
    store.setAudioFormat(next.audioFormat);
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: store.downloadDir || undefined,
        title: "오디오 저장 폴더 선택",
      });
      if (selected && typeof selected === "string") {
        await persistSettings({ downloadDir: selected });
      }
    } catch (err) {
      console.error("폴더 선택 다이얼로그 오류:", err);
    }
  };

  const handleConcurrencyChange = async (value: number) => {
    const concurrency = clampConcurrency(value);
    store.setConcurrency(concurrency);
    await persistSettings({ concurrency });
  };

  const handleAudioFormatChange = async (audioFormat: AudioFormat) => {
    store.setAudioFormat(audioFormat);
    await persistSettings({ audioFormat });
  };

  const handleFetchMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = store.url.trim();

    if (!targetUrl) {
      alert("다운로드할 YouTube 링크 또는 플레이리스트 URL을 입력해 주세요.");
      return;
    }

    const hasDownloaded = await historyService.hasHistory(targetUrl);
    if (hasDownloaded) {
      const confirmResult = window.confirm(
        "이미 다운로드한 기록이 있습니다. 다시 다운로드 하시겠습니까?"
      );
      if (!confirmResult) {
        return;
      }
    }

    store.setIsFetchingMetadata(true);
    store.setStatusMessage("플레이리스트 정보를 불러오는 중...");

    try {
      const metadata = await invoke<PlaylistMetadata>("fetch_metadata", {
        url: targetUrl,
      });
      store.setFetchedPlaylist(metadata);
      store.setIsSelectionModalOpen(true);
      store.setStatusMessage("다운로드할 항목을 선택해 주세요.");
    } catch (err: unknown) {
      console.error("메타데이터 가져오기 실패:", err);
      const errorMessage = typeof err === "string" ? err : String(err);
      store.setStatusMessage(`정보 불러오기 실패: ${errorMessage}`);
      alert(`정보 불러오기 실패: ${errorMessage}`);
    } finally {
      store.setIsFetchingMetadata(false);
    }
  };

  const handleDownloadSelected = async (selectedIndices: number[]) => {
    store.setIsSelectionModalOpen(false);

    if (!store.fetchedPlaylist) return;

    const selectedTracks = store.fetchedPlaylist.tracks
      .filter((t) => selectedIndices.includes(t.index))
      .map((t) => ({ url: t.url, index: t.index }));

    store.resetState();
    store.setTotalItems(selectedTracks.length);
    store.setPlaylistTitle(store.fetchedPlaylist.title);

    try {
      const result = await invoke<string>("download_audio", {
        downloadDir: store.downloadDir || null,
        playlistTitle: store.fetchedPlaylist.title,
        selectedTracks,
        concurrency: store.concurrency,
        audioFormat: store.audioFormat,
      });
      store.setStatus("completed");
      store.setStatusMessage(
        result || "모든 다운로드가 성공적으로 완료되었습니다!"
      );

      await historyService.saveHistory(
        store.url.trim(),
        store.fetchedPlaylist.title || "Unknown Title"
      );
    } catch (err: unknown) {
      console.error("다운로드 에러:", err);
      store.setStatus("error");
      const errorMessage = typeof err === "string" ? err : String(err);
      store.setStatusMessage(`오류 발생: ${errorMessage}`);
    }
  };

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

  const handleRetryFailedDownloads = async (
    failedIndices: string,
    failedCount: number
  ) => {
    if (!store.fetchedPlaylist) return;

    const indicesArr = failedIndices.split(",").map(Number);

    const selectedTracks = store.fetchedPlaylist.tracks
      .filter((t) => indicesArr.includes(t.index))
      .map((t) => ({ url: t.url, index: t.index }));

    store.setStatus("downloading");
    store.setStatusMessage(`실패한 항목 (${failedCount}개) 재다운로드 중...`);

    store.setTracks((prev) => {
      const next = new Map(prev);
      indicesArr.forEach((idx) => {
        const item = next.get(idx);
        if (item) {
          next.set(idx, {
            ...item,
            status: "pending",
            error_message: undefined,
            progress: 0,
          });
        }
      });
      return next;
    });

    try {
      const result = await invoke<string>("download_audio", {
        downloadDir: store.downloadDir || null,
        playlistTitle: store.fetchedPlaylist.title,
        selectedTracks,
        concurrency: store.concurrency,
        audioFormat: store.audioFormat,
      });
      store.setStatus("completed");
      store.setStatusMessage(
        result || "재다운로드가 성공적으로 완료되었습니다!"
      );
    } catch (err: unknown) {
      console.error("재다운로드 에러:", err);
      store.setStatus("error");
      const errorMessage = typeof err === "string" ? err : String(err);
      store.setStatusMessage(`오류 발생: ${errorMessage}`);
    }
  };

  return {
    handleSelectFolder,
    handleFetchMetadata,
    handleDownloadSelected,
    handleCancelDownload,
    handleCreateZip,
    handleRetryFailedDownloads,
    handleConcurrencyChange,
    handleAudioFormatChange,
  };
}
