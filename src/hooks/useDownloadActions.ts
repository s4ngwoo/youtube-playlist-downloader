import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PlaylistMetadata } from "../types/download";
import { useDownloadStore } from "../store/downloadStore";
import { historyService } from "../services/historyService";
import { settingsService } from "../services/settingsService";
import { AudioFormat, AppLocale, clampConcurrency } from "../types/settings";
import { t, useI18n } from "../i18n";
import { mapBackendMessage } from "../i18n/mapBackendMessage";

export function useDownloadActions() {
  const store = useDownloadStore();

  const persistSettings = async (partial: {
    downloadDir?: string;
    concurrency?: number;
    audioFormat?: AudioFormat;
    locale?: AppLocale;
  }) => {
    const next = await settingsService.update({
      downloadDir: partial.downloadDir ?? store.downloadDir,
      concurrency: partial.concurrency ?? store.concurrency,
      audioFormat: partial.audioFormat ?? store.audioFormat,
      locale: partial.locale ?? useI18n.getState().locale,
    });
    store.setDownloadDir(next.downloadDir);
    store.setConcurrency(next.concurrency);
    store.setAudioFormat(next.audioFormat);
    useI18n.getState().setLocale(next.locale);
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: store.downloadDir || undefined,
        title: t("dialog.selectFolder"),
      });
      if (selected && typeof selected === "string") {
        await persistSettings({ downloadDir: selected });
      }
    } catch (err) {
      console.error("Folder dialog error:", err);
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

  const handleLocaleChange = async (locale: AppLocale) => {
    useI18n.getState().setLocale(locale);
    await persistSettings({ locale });
  };

  const handleFetchMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = store.url.trim();

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

    store.setIsFetchingMetadata(true);
    store.setStatusMessage(t("status.fetchingPlaylist"));

    try {
      const metadata = await invoke<PlaylistMetadata>("fetch_metadata", {
        url: targetUrl,
      });
      store.setFetchedPlaylist(metadata);
      store.setIsSelectionModalOpen(true);
      store.setStatusMessage(t("status.selectItems"));
    } catch (err: unknown) {
      console.error("Metadata fetch failed:", err);
      const errorMessage = mapBackendMessage(
        typeof err === "string" ? err : String(err)
      );
      store.setStatusMessage(t("status.fetchFailed", { error: errorMessage }));
      alert(t("status.fetchFailed", { error: errorMessage }));
    } finally {
      store.setIsFetchingMetadata(false);
    }
  };

  const handleDownloadSelected = async (selectedIndices: number[]) => {
    store.setIsSelectionModalOpen(false);

    if (!store.fetchedPlaylist) return;

    const selectedTracks = store.fetchedPlaylist.tracks
      .filter((tr) => selectedIndices.includes(tr.index))
      .map((tr) => ({ url: tr.url, index: tr.index }));

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
        mapBackendMessage(result || "ok.download_complete")
      );

      await historyService.saveHistory(
        store.url.trim(),
        store.fetchedPlaylist.title || "Unknown Title"
      );
    } catch (err: unknown) {
      console.error("Download error:", err);
      store.setStatus("error");
      const errorMessage = mapBackendMessage(
        typeof err === "string" ? err : String(err)
      );
      store.setStatusMessage(t("status.error", { error: errorMessage }));
    }
  };

  const handleCancelDownload = async () => {
    try {
      store.setStatusMessage(t("status.cancelling"));
      const msg = await invoke<string>("cancel_download");
      store.setStatus("cancelled");
      store.setStatusMessage(mapBackendMessage(msg || "ok.cancelled"));
      store.setCurrentSpeed("");
      store.setCurrentEta("");
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const handleCreateZip = async () => {
    if (!store.downloadDir) {
      alert(t("alert.needFolder"));
      return;
    }
    store.setIsZipping(true);
    store.setStatusMessage(t("status.zipping"));
    try {
      const result = await invoke<string>("create_mobile_zip", {
        downloadDir: store.downloadDir,
      });
      alert(mapBackendMessage(result));
      store.setStatusMessage(t("status.zipDone"));
    } catch (err: unknown) {
      console.error("ZIP error:", err);
      const errorMessage = mapBackendMessage(
        typeof err === "string" ? err : String(err)
      );
      alert(t("status.zipFailed", { error: errorMessage }));
      store.setStatusMessage(t("status.error", { error: errorMessage }));
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
      .filter((tr) => indicesArr.includes(tr.index))
      .map((tr) => ({ url: tr.url, index: tr.index }));

    store.setStatus("downloading");
    store.setStatusMessage(t("status.retrying", { count: failedCount }));

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
        mapBackendMessage(result || "ok.download_complete") ||
          t("status.retryComplete")
      );
    } catch (err: unknown) {
      console.error("Retry error:", err);
      store.setStatus("error");
      const errorMessage = mapBackendMessage(
        typeof err === "string" ? err : String(err)
      );
      store.setStatusMessage(t("status.error", { error: errorMessage }));
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
    handleLocaleChange,
  };
}
