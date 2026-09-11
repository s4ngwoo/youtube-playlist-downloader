import {
  cancelDownload,
  createMobileZip,
  downloadAudio,
  fetchMetadata,
  type SelectedTrack,
} from "../api/download";
import { selectTracksByIndices } from "../lib/downloadSelection";
import { PlaylistMetadata } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";
import { historyService } from "../services/historyService";
import { t } from "../i18n";
import { mapBackendMessage } from "../i18n/mapBackendMessage";

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

    state.setStatus("completed");
    state.setStatusMessage(mapBackendMessage(result || "ok.download_complete"));

    if (options?.saveHistory) {
      await historyService.saveHistory(
        (options.urlForHistory ?? state.url).trim(),
        playlist.title || "Unknown Title",
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

    state.beginDownloadSession();
    state.setTotalItems(selectedTracks.length);
    state.setPlaylistTitle(state.fetchedPlaylist.title);

    try {
      await runDownload(state.fetchedPlaylist, selectedTracks, {
        saveHistory: true,
      });
    } catch (err: unknown) {
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
          });
        }
      });
      return next;
    });

    try {
      await runDownload(state.fetchedPlaylist, selectedTracks);
      useDownloadStore
        .getState()
        .setStatusMessage(mapBackendMessage("ok.download_complete") || t("status.retryComplete"));
    } catch (err: unknown) {
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
