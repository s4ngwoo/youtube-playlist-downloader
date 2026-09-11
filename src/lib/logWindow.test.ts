import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => {
    throw new Error("no tauri");
  },
}));

describe("isLogViewerWindow", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Minimal location stub for node vitest (no jsdom).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {
      location: { search: "", href: "https://app.local/" },
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
    vi.resetModules();
  });

  it("detects query param", async () => {
    window.location.search = "?window=log";
    window.location.href = "https://app.local/?window=log";
    const { isLogViewerWindow } = await import("./logWindow");
    expect(isLogViewerWindow()).toBe(true);
  });

  it("returns false without param", async () => {
    window.location.search = "";
    window.location.href = "https://app.local/";
    const { isLogViewerWindow } = await import("./logWindow");
    expect(isLogViewerWindow()).toBe(false);
  });
});
