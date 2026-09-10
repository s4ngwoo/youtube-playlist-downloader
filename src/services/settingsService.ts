import {
  AppSettings,
  DEFAULT_SETTINGS,
  clampConcurrency,
  normalizeAudioFormat,
} from "../types/settings";

const SETTINGS_STORE_FILE = "settings.json";
const LEGACY_DOWNLOAD_DIR_KEY = "yt_download_dir";

let storePromise: Promise<import("@tauri-apps/plugin-store").Store> | null =
  null;

async function getStore() {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) =>
      load(SETTINGS_STORE_FILE)
    );
  }
  return storePromise;
}

function mergeSettings(partial: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    downloadDir:
      typeof partial?.downloadDir === "string"
        ? partial.downloadDir
        : DEFAULT_SETTINGS.downloadDir,
    concurrency: clampConcurrency(
      partial?.concurrency ?? DEFAULT_SETTINGS.concurrency
    ),
    audioFormat: normalizeAudioFormat(
      partial?.audioFormat ?? DEFAULT_SETTINGS.audioFormat
    ),
  };
}

export const settingsService = {
  async load(): Promise<AppSettings> {
    try {
      const store = await getStore();
      const saved = await store.get<Partial<AppSettings>>("app");
      let settings = mergeSettings(saved);

      // One-time migration from legacy localStorage key
      if (!settings.downloadDir) {
        const legacy = localStorage.getItem(LEGACY_DOWNLOAD_DIR_KEY);
        if (legacy && legacy.trim()) {
          settings = { ...settings, downloadDir: legacy };
          await this.save(settings);
          localStorage.removeItem(LEGACY_DOWNLOAD_DIR_KEY);
        }
      } else if (localStorage.getItem(LEGACY_DOWNLOAD_DIR_KEY)) {
        // Prefer store; drop stale localStorage duplicate
        localStorage.removeItem(LEGACY_DOWNLOAD_DIR_KEY);
      }

      return settings;
    } catch (err) {
      console.error("설정 불러오기 실패:", err);
      const legacy = localStorage.getItem(LEGACY_DOWNLOAD_DIR_KEY);
      if (legacy) {
        return mergeSettings({ downloadDir: legacy });
      }
      return { ...DEFAULT_SETTINGS };
    }
  },

  async save(settings: AppSettings): Promise<void> {
    try {
      const store = await getStore();
      const normalized = mergeSettings(settings);
      await store.set("app", normalized);
      await store.save();
    } catch (err) {
      console.warn("설정 저장 실패:", err);
    }
  },

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.load();
    const next = mergeSettings({ ...current, ...partial });
    await this.save(next);
    return next;
  },
};
