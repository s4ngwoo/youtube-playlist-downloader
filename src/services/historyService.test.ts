import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { historyService } from "./historyService";

const { store, mockStore } = vi.hoisted(() => {
  const store = new Map<string, { url: string; title: string; date: string }>();
  const mockStore = {
    entries: vi.fn(async () => Array.from(store.entries())),
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: { url: string; title: string; date: string }) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    save: vi.fn(async () => {}),
  };
  return { store, mockStore };
});

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(async () => mockStore),
}));

describe("historyService", () => {
  beforeEach(() => {
    store.clear();
    mockStore.entries.mockReset();
    mockStore.get.mockReset();
    mockStore.set.mockReset();
    mockStore.delete.mockReset();
    mockStore.save.mockReset();
    mockStore.entries.mockImplementation(async () => Array.from(store.entries()));
    mockStore.get.mockImplementation(async (key: string) => store.get(key));
    mockStore.set.mockImplementation(
      async (key: string, value: { url: string; title: string; date: string }) => {
        store.set(key, value);
      },
    );
    mockStore.delete.mockImplementation(async (key: string) => {
      store.delete(key);
    });
    mockStore.save.mockImplementation(async () => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns history newest first", async () => {
    store.set("https://a.example/1", {
      url: "https://a.example/1",
      title: "Older",
      date: "2026-01-01T00:00:00.000Z",
    });
    store.set("https://a.example/2", {
      url: "https://a.example/2",
      title: "Newer",
      date: "2026-09-01T00:00:00.000Z",
    });

    const items = await historyService.getHistory();

    expect(items.map((item) => item.title)).toEqual(["Newer", "Older"]);
  });

  it("reports whether a URL was downloaded before", async () => {
    store.set("https://a.example/1", {
      url: "https://a.example/1",
      title: "Track",
      date: "2026-09-01T00:00:00.000Z",
    });

    await expect(historyService.hasHistory("https://a.example/1")).resolves.toBe(true);
    await expect(historyService.hasHistory("https://missing.example")).resolves.toBe(false);
  });

  it("stores a fallback title when none is provided", async () => {
    await historyService.saveHistory("https://a.example/3", "");

    const saved = store.get("https://a.example/3");
    expect(saved?.title).toBe("Unknown Title");
    expect(saved?.url).toBe("https://a.example/3");
    expect(saved?.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockStore.save).toHaveBeenCalled();
  });

  it("returns an empty list when the store cannot be read", async () => {
    mockStore.entries.mockRejectedValueOnce(new Error("store unavailable"));

    await expect(historyService.getHistory()).resolves.toEqual([]);
  });
});
