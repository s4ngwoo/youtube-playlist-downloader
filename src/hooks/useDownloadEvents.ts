import { useEffect } from "react";
import { onDownloadProgress } from "../api/download";
import { ProgressPayload, TrackItem } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";
import { isPostprocessStatus, computeSessionProgress } from "../lib/sessionEta";
import { mergeTrackTitle } from "../lib/trackProgress";
import { describeSessionActivity } from "../lib/sessionActivity";
import { pushTrackConsoleLine } from "../lib/trackConsole";
import { t } from "../i18n";

/** Wall-clock start of download phase per track index (session-local). */
const downloadPhaseStartedAt = new Map<number, number>();

function clearSessionTiming() {
  downloadPhaseStartedAt.clear();
}

export function resetDownloadPhaseTimingForTests() {
  clearSessionTiming();
}

function resolveTrackStatus(payload: ProgressPayload): TrackItem["status"] {
  if (payload.track_status === "completed") return "completed";
  if (payload.track_status === "tagging") return "tagging";
  if (payload.track_status === "converting_art") return "converting_art";
  if (payload.track_status === "extracting") return "extracting";
  if (payload.track_status === "failed") return "failed";
  if (payload.track_status === "pending") return "pending";
  if (payload.track_progress != null && payload.track_progress >= 100) return "extracting";
  return "downloading";
}

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

          const idx = payload.item_index;
          if (idx !== undefined && idx !== null && idx > 0) {
            const trackStatus = resolveTrackStatus(payload);
            const nowMs = Date.now();
            const existing = store.tracks.get(idx);
            const prevStatus = existing?.status;

            if (trackStatus === "downloading" && !downloadPhaseStartedAt.has(idx)) {
              downloadPhaseStartedAt.set(idx, nowMs);
            }

            const leavingDownload =
              prevStatus === "downloading" &&
              trackStatus !== "downloading" &&
              trackStatus !== "pending";

            if (leavingDownload) {
              const started = downloadPhaseStartedAt.get(idx);
              if (started != null) {
                store.recordDownloadSample((nowMs - started) / 1000);
                downloadPhaseStartedAt.delete(idx);
              }
            }

            if (trackStatus === "completed" || trackStatus === "failed") {
              downloadPhaseStartedAt.delete(idx);
            }

            store.setTracks((prev) => {
              const next = new Map(prev);
              const prevTrack = next.get(idx);

              const currentTitle = mergeTrackTitle(
                prevTrack?.title,
                payload.item_title,
                idx,
              );

              const progress =
                trackStatus === "completed"
                  ? 100
                  : payload.track_progress !== undefined && payload.track_progress !== null
                    ? payload.track_progress
                    : prevTrack?.progress || 0;

              const inPostOrDone =
                isPostprocessStatus(trackStatus) ||
                trackStatus === "completed" ||
                trackStatus === "failed";

              next.set(idx, {
                index: idx,
                title: currentTitle,
                progress,
                status: trackStatus,
                speed: inPostOrDone ? undefined : payload.speed || prevTrack?.speed,
                eta: inPostOrDone
                  ? undefined
                  : trackStatus === "downloading"
                    ? payload.eta || prevTrack?.eta
                    : undefined,
                error_message: payload.error_message || prevTrack?.error_message,
                consoleLines: rawText
                  ? pushTrackConsoleLine(prevTrack?.consoleLines, rawText)
                  : prevTrack?.consoleLines,
              });

              return next;
            });

            const latest = useDownloadStore.getState();
            const session = computeSessionProgress(
              latest.tracks.values(),
              latest.concurrency,
              latest.avgDownloadSec,
            );
            const activity = describeSessionActivity({
              receiving: session.receivingCount,
              queued: session.queuedCount,
              postprocess: session.postprocessCount,
              completed: session.completedCount,
              failed: session.failedCount,
              total: session.totalCount || latest.totalItems,
            });
            latest.setStatusMessage(t(activity.key, activity.vars));
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

/** Clear timing map when a new download session begins (call from flow). */
export function onDownloadSessionBegin() {
  clearSessionTiming();
}
