import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../types/settings";
import { settingsService } from "./settingsService";

const { store, mockStore } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  const mockStore = {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    save: vi.fn(async () => {}),
  };
  return { store, mockStore };
});

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(async () => mockStore),
}));

const memory = new Map<string, string>();

function installLocalStorage() {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
}

describe("settingsService", () => {
  beforeEach(() => {
    store.clear();
    mockStore.get.mockReset();
    mockStore.set.mockReset();
    mockStore.save.mockReset();
    mockStore.get.mockImplementation(async (key: string) => store.get(key));
    mockStore.set.mockImplementation(async (key: string, value: unknown) => {
      store.set(key, value);
    });
    mockStore.save.mockImplementation(async () => {});
    installLocalStorage();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes invalid persisted values on load", async () => {
    store.set("app", {
      downloadDir: "/Music",
      concurrency: 99,
      audioFormat: "flac",
      locale: "fr",
    });

    await expect(settingsService.load()).resolves.toEqual({
      downloadDir: "/Music",
      concurrency: 8,
      audioFormat: "m4a",
      locale: "ko",
    });
  });

  it("migrates a legacy download directory from localStorage once", async () => {
    memory.set("yt_download_dir", "/legacy/downloads");

    const loaded = await settingsService.load();

    expect(loaded.downloadDir).toBe("/legacy/downloads");
    expect(mockStore.set).toHaveBeenCalledWith(
      "app",
      expect.objectContaining({ downloadDir: "/legacy/downloads" })
    );
    expect(mockStore.save).toHaveBeenCalled();
    expect(memory.has("yt_download_dir")).toBe(false);
  });

  it("drops a stale localStorage duplicate when the store already has a directory", async () => {
    store.set("app", { downloadDir: "/from-store" });
    memory.set("yt_download_dir", "/legacy/downloads");

    const loaded = await settingsService.load();

    expect(loaded.downloadDir).toBe("/from-store");
    expect(memory.has("yt_download_dir")).toBe(false);
  });

  it("falls back to defaults when the store cannot be opened", async () => {
    mockStore.get.mockRejectedValueOnce(new Error("store unavailable"));

    await expect(settingsService.load()).resolves.toEqual({ ...DEFAULT_SETTINGS });
  });

  it("merges partial updates onto the saved settings", async () => {
    store.set("app", {
      downloadDir: "/Music",
      concurrency: 3,
      audioFormat: "m4a",
      locale: "ko",
    });

    const next = await settingsService.update({
      concurrency: 0,
      audioFormat: "mp3",
      locale: "en",
    });

    expect(next).toEqual({
      downloadDir: "/Music",
      concurrency: 1,
      audioFormat: "mp3",
      locale: "en",
    });
    expect(mockStore.set).toHaveBeenCalledWith("app", next);
    expect(mockStore.save).toHaveBeenCalled();
  });
});
