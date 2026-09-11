import { open } from "@tauri-apps/plugin-dialog";
import { useDownloadStore } from "../store/downloadStore";
import { settingsService } from "../services/settingsService";
import { AudioFormat, AppLocale, clampConcurrency } from "../types/settings";
import { t, useI18n } from "../i18n";

export function useSettingsActions() {
  const persistSettings = async (partial: {
    downloadDir?: string;
    concurrency?: number;
    audioFormat?: AudioFormat;
    locale?: AppLocale;
  }) => {
    const state = useDownloadStore.getState();
    const next = await settingsService.update({
      downloadDir: partial.downloadDir ?? state.downloadDir,
      concurrency: partial.concurrency ?? state.concurrency,
      audioFormat: partial.audioFormat ?? state.audioFormat,
      locale: partial.locale ?? useI18n.getState().locale,
    });
    state.setDownloadDir(next.downloadDir);
    state.setConcurrency(next.concurrency);
    state.setAudioFormat(next.audioFormat);
    useI18n.getState().setLocale(next.locale);
  };

  const handleSelectFolder = async () => {
    try {
      const state = useDownloadStore.getState();
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: state.downloadDir || undefined,
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
    useDownloadStore.getState().setConcurrency(concurrency);
    await persistSettings({ concurrency });
  };

  const handleAudioFormatChange = async (audioFormat: AudioFormat) => {
    useDownloadStore.getState().setAudioFormat(audioFormat);
    await persistSettings({ audioFormat });
  };

  const handleLocaleChange = async (locale: AppLocale) => {
    useI18n.getState().setLocale(locale);
    await persistSettings({ locale });
  };

  return {
    handleSelectFolder,
    handleConcurrencyChange,
    handleAudioFormatChange,
    handleLocaleChange,
  };
}
