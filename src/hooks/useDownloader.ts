import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { ProgressPayload, TrackItem, PlaylistMetadata } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";

export function useDownloader() {
  const store = useDownloadStore();

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [fetchedPlaylist, setFetchedPlaylist] = useState<PlaylistMetadata | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // 1. 전체 완료율 및 트랙 리스트 계산
  const trackList = useMemo(() => {
    return Array.from(store.tracks.values()).sort((a, b) => a.index - b.index);
  }, [store.tracks]);

  const completedCount = useMemo(() => {
    return trackList.filter((t) => t.status === "completed").length;
  }, [trackList]);

  // 플레이리스트 종합 진행률 계산 (완료된 곡 수 + 현재 진행 중인 곡의 진행률 가중치)
  const overallPercent = useMemo(() => {
    if (store.totalItems <= 0) return 0;
    let totalProgressSum = 0;
    for (let i = 1; i <= store.totalItems; i++) {
      const track = store.tracks.get(i);
      if (track) {
        if (track.status === "completed") {
          totalProgressSum += 100;
        } else {
          totalProgressSum += track.progress;
        }
      }
    }
    return Math.min(100, Math.max(0, totalProgressSum / store.totalItems));
  }, [store.tracks, store.totalItems]);

  // 2. 저장 폴더 초기 설정 (로컬 스토리지 확인 또는 OS 기본 다운로드 디렉토리 로드)
  useEffect(() => {
    const saved = localStorage.getItem("yt_download_dir");
    if (saved) {
      store.setDownloadDir(saved);
    } else {
      invoke<string>("get_default_download_dir")
        .then((dir) => {
          if (dir) {
            store.setDownloadDir(dir);
            localStorage.setItem("yt_download_dir", dir);
          }
        })
        .catch((err) => console.error("기본 저장 폴더 조회 실패:", err));
    }
  }, []); // 빈 의존성 배열로 한 번만 실행되도록 유지

  // 3. Tauri "download-progress" 실시간 이벤트 리스닝 및 클린업
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let isMounted = true;

    async function setupListener() {
      try {
        const unsubscribe = await listen<ProgressPayload>(
          "download-progress",
          (event) => {
            if (!isMounted) return;

            const payload = event.payload;
            const rawText = payload.message || payload.line || "";
            const isError = payload.is_error;

            // 콘솔 로그 추가
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
              .getMinutes()
              .toString()
              .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

            // zustand store에서 직접 상태 업데이트
            // setState는 항상 최신 상태를 기반으로 업데이트할 수 있습니다.
            useDownloadStore.getState().addLog({
              text: rawText,
              isError,
              timestamp: timeStr,
            });

            // 플레이리스트 메타데이터 업데이트
            if (payload.playlist_title) {
              useDownloadStore.getState().setPlaylistTitle(payload.playlist_title);
            }

            if (payload.total_items && payload.total_items > 0) {
              useDownloadStore.getState().setTotalItems(payload.total_items);
            }

            if (payload.speed) useDownloadStore.getState().setCurrentSpeed(payload.speed);
            if (payload.eta) useDownloadStore.getState().setCurrentEta(payload.eta);

            // 개별 트랙 상태 및 진행률 업데이트
            const idx = payload.item_index;
            if (idx !== undefined && idx !== null && idx > 0) {
              useDownloadStore.getState().setTracks((prev) => {
                const next = new Map(prev);
                const existing = next.get(idx);

                const currentTitle =
                  payload.item_title ||
                  existing?.title ||
                  `트랙 #${idx.toString().padStart(2, "0")}`;

                // 상태 결정
                let trackStatus: TrackItem["status"] = "downloading";
                if (payload.track_status === "completed") {
                  trackStatus = "completed";
                } else if (payload.track_status === "tagging") {
                  trackStatus = "tagging";
                } else if (payload.track_status === "converting_art") {
                  trackStatus = "converting_art";
                } else if (payload.track_status === "extracting") {
                  trackStatus = "extracting";
                } else if (payload.track_status === "failed") {
                  trackStatus = "failed";
                } else if (payload.track_progress && payload.track_progress >= 100) {
                  trackStatus = "extracting";
                }

                const progress =
                  trackStatus === "completed"
                    ? 100
                    : payload.track_progress !== undefined && payload.track_progress !== null
                    ? payload.track_progress
                    : existing?.progress || 0;

                next.set(idx, {
                  index: idx,
                  title: currentTitle,
                  progress,
                  status: trackStatus,
                  speed: payload.speed || existing?.speed,
                  eta: payload.eta || existing?.eta,
                  error_message: payload.error_message || existing?.error_message,
                });

                return next;
              });

              useDownloadStore.getState().setStatusMessage(
                payload.item_title
                  ? `[${idx}/${payload.total_items || "?"}] "${payload.item_title}" 처리 중...`
                  : `트랙 ${idx}/${payload.total_items || "?"} 다운로드 중...`
              );
            }
          }
        );

        if (isMounted) {
          unlisten = unsubscribe;
        } else {
          unsubscribe();
        }
      } catch (err) {
        console.error("이벤트 리스너 등록 실패:", err);
      }
    }

    setupListener();

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  // 4. 다운로드 저장 폴더 선택 다이얼로그 핸들러
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

  // 다운로드 시작 대신 메타데이터 가져오기 핸들러 (모달 띄우기)
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

  // 모달에서 선택한 항목들만 다운로드 시작
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
        await storePl.set(targetUrl, { url: targetUrl, date: new Date().toISOString() });
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

  // 6. 다운로드 취소 핸들러
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

  // 7. 모바일 호환 ZIP 압축 핸들러
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

  // 8. 실패한 다운로드 재시도 핸들러
  const handleRetryFailedDownloads = async () => {
    const failedTracks = trackList.filter((t) => t.status === "failed");
    if (failedTracks.length === 0) return;

    const failedIndices = failedTracks.map((t) => t.index).join(",");
    const targetUrl = store.url.trim();

    store.setStatus("downloading");
    store.setStatusMessage(`실패한 항목 (${failedTracks.length}개) 재다운로드 중...`);

    // 기존 트랙 상태를 pending으로 초기화
    store.setTracks((prev) => {
      const next = new Map(prev);
      failedTracks.forEach((t) => {
        const item = next.get(t.index);
        if (item) {
          next.set(t.index, { ...item, status: "pending", error_message: undefined, progress: 0 });
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

  const failedCount = useMemo(() => trackList.filter((t) => t.status === "failed").length, [trackList]);

  return {
    url: store.url,
    setUrl: store.setUrl,
    downloadDir: store.downloadDir,
    status: store.status,
    statusMessage: store.statusMessage,
    playlistTitle: store.playlistTitle,
    totalItems: store.totalItems,
    tracks: store.tracks,
    trackList,
    completedCount,
    overallPercent,
    currentSpeed: store.currentSpeed,
    currentEta: store.currentEta,
    logs: store.logs,
    setLogs: store.setLogs,
    autoScroll: store.autoScroll,
    setAutoScroll: store.setAutoScroll,
    isConsoleCollapsed: store.isConsoleCollapsed,
    setIsConsoleCollapsed: store.setIsConsoleCollapsed,
    isZipping: store.isZipping,
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
  };
}
