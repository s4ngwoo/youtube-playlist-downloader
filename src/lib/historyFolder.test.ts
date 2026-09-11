import { describe, expect, it } from "vitest";
import { HISTORY_FOLDER_OPEN_VIA, resolveHistoryFolder } from "./historyFolder";

describe("resolveHistoryFolder", () => {
  it("prefers item downloadDir", () => {
    expect(resolveHistoryFolder({ downloadDir: "/a" }, "/b")).toBe("/a");
  });

  it("falls back to current settings dir", () => {
    expect(resolveHistoryFolder({}, "/b")).toBe("/b");
    expect(resolveHistoryFolder({ downloadDir: "  " }, "/b")).toBe("/b");
  });

  it("returns null when neither available", () => {
    expect(resolveHistoryFolder({}, "")).toBeNull();
    expect(resolveHistoryFolder({}, undefined)).toBeNull();
  });
});

describe("HISTORY_FOLDER_OPEN_VIA", () => {
  it("uses reveal-in-dir (opener:default has no open-path)", () => {
    expect(HISTORY_FOLDER_OPEN_VIA).toBe("reveal-in-dir");
  });
});
