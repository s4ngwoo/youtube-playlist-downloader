import {
  cancelDownload,
  createMobileZip,
  downloadAudio,
  fetchMetadata,
  type SelectedTrack,
} from "../api/download";
import { selectTracksByIndices } from "../lib/downloadSelection";
import { mergeTrackTitle } from "../lib/trackProgress";
import { PlaylistMetadata, TrackItem, isCancelledDownloadOutcome } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";
import { historyService } from "../services/historyService";
import { onDownloadSessionBegin } from "./useDownloadEvents";
import { t } from "../i18n";
import { mapBackendMessage } from "../i18n/mapBackendMessage";

/** Seed the track map for the selected indexes before download_audio starts. */
export function seedPendingTracks(
  selectedTracks: SelectedTrack[],
  playlist: PlaylistMetadata,
): Map<number, TrackItem> {
  const byIndex = new Map(playlist.tracks.map((tr) => [tr.index, tr]));
  const seeded = new Map<number, TrackItem>();
  for (const sel of selectedTracks) {
    const meta = byIndex.get(sel.index);
    seeded.set(sel.index, {
      index: sel.index,
      title: mergeTrackTitle(meta?.title, sel.title, sel.index),
      progress: 0,
      status: "pending",
    });
  }
  return seeded;
}

export function useDownloadFlow() {
  const runDownload = async (
    playlist: PlaylistMetadata,
    selectedTracks: SelectedTrack[],
    options?: { saveHistory?: boolean; urlForHistory?: string },
  ) => {
    const state = useDownloadStore.getState();
    const result = await downloadAudio({
      downloadDir: state.downloadDir || null,
      playlistTitle: playlist.title,
      selectedTracks,
      concurrency: state.concurrency,
      audioFormat: state.audioFormat,
    });

    const next = useDownloadStore.getState();
    if (isCancelledDownloadOutcome(next.status, result)) {
      next.setStatus("cancelled");
      next.setStatusMessage(mapBackendMessage("ok.cancelled"));
      return result;
    }

    next.setStatus("completed");
    next.setStatusMessage(mapBackendMessage(result || "ok.download_complete"));

    if (options?.saveHistory) {
      await historyService.saveHistory(
        (options.urlForHistory ?? next.url).trim(),
        playlist.title || "Unknown Title",
        next.downloadDir,
      );
    }

    return result;
  };

  const handleFetchMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const state = useDownloadStore.getState();
    const targetUrl = state.url.trim();

    if (!targetUrl) {
      alert(t("alert.needUrl"));
      return;
    }

    const hasDownloaded = await historyService.hasHistory(targetUrl);
    if (hasDownloaded) {
      const confirmResult = window.confirm(t("alert.alreadyDownloaded"));
      if (!confirmResult) {
        return;
      }
    }

    state.setIsFetchingMetadata(true);
    state.setStatusMessage(t("status.fetchingPlaylist"));

    try {
      const metadata = await fetchMetadata(targetUrl);
      const next = useDownloadStore.getState();
      next.setFetchedPlaylist(metadata);
      next.setIsSelectionModalOpen(true);
      next.setStatusMessage(t("status.selectItems"));
    } catch (err: unknown) {
      console.error("Metadata fetch failed:", err);
      const errorMessage = mapBackendMessage(typeof err === "string" ? err : String(err));
      const next = useDownloadStore.getState();
      next.setStatusMessage(t("status.fetchFailed", { error: errorMessage }));
      alert(t("status.fetchFailed", { error: errorMessage }));
    } finally {
      useDownloadStore.getState().setIsFetchingMetadata(false);
    }
  };

  const handleDownloadSelected = async (selectedIndices: number[]) => {
    const state = useDownloadStore.getState();
    state.setIsSelectionModalOpen(false);

    if (!state.fetchedPlaylist) return;

    const selectedTracks = selectTracksByIndices(state.fetchedPlaylist.tracks, selectedIndices);

    onDownloadSessionBegin();
    state.beginDownloadSession();
    state.setTracks(seedPendingTracks(selectedTracks, state.fetchedPlaylist));
    state.setTotalItems(selectedTracks.length);
    state.setPlaylistTitle(state.fetchedPlaylist.title);
    state.setStatusMessage(t("status.preparingDownloads", { count: selectedTracks.length }));

    try {
      await runDownload(state.fetchedPlaylist, selectedTracks, {
        saveHistory: true,
      });
    } catch (err: unknown) {
      if (isCancelledDownloadOutcome(useDownloadStore.getState().status)) {
        return;
      }
      console.error("Download error:", err);
      const next = useDownloadStore.getState();
      next.setStatus("error");
      const errorMessage = mapBackendMessage(typeof err === "string" ? err : String(err));
      next.setStatusMessage(t("status.error", { error: errorMessage }));
    }
  };

  const handleCancelDownload = async () => {
    try {
      const state = useDownloadStore.getState();
      state.setStatusMessage(t("status.cancelling"));
      const msg = await cancelDownload();
      const next = useDownloadStore.getState();
      next.setStatus("cancelled");
      next.setStatusMessage(mapBackendMessage(msg || "ok.cancelled"));
      next.setCurrentSpeed("");
      next.setCurrentEta("");
      onDownloadSessionBegin();
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const handleCreateZip = async () => {
    const state = useDownloadStore.getState();
    if (!state.downloadDir) {
      alert(t("alert.needFolder"));
      return;
    }
    state.setIsZipping(true);
    state.setStatusMessage(t("status.zipping"));
    try {
      const result = await createMobileZip(state.downloadDir);
      alert(mapBackendMessage(result));
      useDownloadStore.getState().setStatusMessage(t("status.zipDone"));
    } catch (err: unknown) {
      console.error("ZIP error:", err);
      const errorMessage = mapBackendMessage(typeof err === "string" ? err : String(err));
      alert(t("status.zipFailed", { error: errorMessage }));
      useDownloadStore.getState().setStatusMessage(t("status.error", { error: errorMessage }));
    } finally {
      useDownloadStore.getState().setIsZipping(false);
    }
  };

  const handleRetryFailedDownloads = async (failedIndices: number[]) => {
    const state = useDownloadStore.getState();
    if (!state.fetchedPlaylist || failedIndices.length === 0) return;

    const selectedTracks = selectTracksByIndices(state.fetchedPlaylist.tracks, failedIndices);

    state.setStatus("downloading");
    state.setStatusMessage(t("status.retrying", { count: failedIndices.length }));

    state.setTracks((prev) => {
      const next = new Map(prev);
      failedIndices.forEach((idx) => {
        const item = next.get(idx);
        if (item) {
          next.set(idx, {
            ...item,
            status: "pending",
            error_message: undefined,
            progress: 0,
            eta: undefined,
            speed: undefined,
          });
        }
      });
      return next;
    });

    try {
      const result = await runDownload(state.fetchedPlaylist, selectedTracks);
      if (isCancelledDownloadOutcome(useDownloadStore.getState().status, result)) {
        return;
      }
      useDownloadStore
        .getState()
        .setStatusMessage(mapBackendMessage("ok.download_complete") || t("status.retryComplete"));
    } catch (err: unknown) {
      if (isCancelledDownloadOutcome(useDownloadStore.getState().status)) {
        return;
      }
      console.error("Retry error:", err);
      const next = useDownloadStore.getState();
      next.setStatus("error");
      const errorMessage = mapBackendMessage(typeof err === "string" ? err : String(err));
      next.setStatusMessage(t("status.error", { error: errorMessage }));
    }
  };

  return {
    handleFetchMetadata,
    handleDownloadSelected,
    handleCancelDownload,
    handleCreateZip,
    handleRetryFailedDownloads,
  };
}
