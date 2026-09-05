import { useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ProgressPayload, TrackItem } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";

export function useDownloadEvents() {
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
            const store = useDownloadStore.getState();
            store.addLog({
              text: rawText,
              isError,
              timestamp: timeStr,
            });

            // 플레이리스트 메타데이터 업데이트
            if (payload.playlist_title) {
              store.setPlaylistTitle(payload.playlist_title);
            }

            if (payload.total_items && payload.total_items > 0) {
              store.setTotalItems(payload.total_items);
            }

            if (payload.speed) store.setCurrentSpeed(payload.speed);
            if (payload.eta) store.setCurrentEta(payload.eta);

            // 개별 트랙 상태 및 진행률 업데이트
            const idx = payload.item_index;
            if (idx !== undefined && idx !== null && idx > 0) {
              store.setTracks((prev) => {
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

              store.setStatusMessage(
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
}
