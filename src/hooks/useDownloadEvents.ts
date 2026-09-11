import { useEffect } from "react";
import { onDownloadProgress } from "../api/download";
import { ProgressPayload, TrackItem } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";
import { t } from "../i18n";

export function useDownloadEvents() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    async function setupListener() {
      try {
        const unsubscribe = await onDownloadProgress((payload: ProgressPayload) => {
          if (!isMounted) return;

          const rawText = payload.message || payload.line || "";
          const isError = payload.is_error;

          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

          const store = useDownloadStore.getState();
          store.addLog({
            text: rawText,
            isError,
            timestamp: timeStr,
          });

          if (payload.playlist_title) {
            store.setPlaylistTitle(payload.playlist_title);
          }

          if (payload.total_items && payload.total_items > 0) {
            store.setTotalItems(payload.total_items);
          }

          if (payload.speed) store.setCurrentSpeed(payload.speed);
          if (payload.eta) store.setCurrentEta(payload.eta);

          const idx = payload.item_index;
          if (idx !== undefined && idx !== null && idx > 0) {
            store.setTracks((prev) => {
              const next = new Map(prev);
              const existing = next.get(idx);

              const currentTitle =
                payload.item_title ||
                existing?.title ||
                t("tracks.fallbackTitle", {
                  index: idx.toString().padStart(2, "0"),
                });

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
              t("status.downloadingTrack", {
                index: idx,
                total: payload.total_items || "?",
              }),
            );
          }
        });

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
