import { describe, expect, it } from "vitest";
import { resolveHistoryFolder } from "./historyFolder";

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
