import { describe, expect, it } from "vitest";
import { clampConcurrency, normalizeAudioFormat, normalizeLocale } from "./settings";

describe("clampConcurrency", () => {
  it("clamps to 1–8", () => {
    expect(clampConcurrency(0)).toBe(1);
    expect(clampConcurrency(9)).toBe(8);
    expect(clampConcurrency(3)).toBe(3);
  });

  it("falls back for non-finite", () => {
    expect(clampConcurrency(Number.NaN)).toBe(3);
  });
});

describe("normalizeAudioFormat", () => {
  it("accepts mp3 or defaults to m4a", () => {
    expect(normalizeAudioFormat("mp3")).toBe("mp3");
    expect(normalizeAudioFormat("m4a")).toBe("m4a");
    expect(normalizeAudioFormat("flac")).toBe("m4a");
  });
});

describe("normalizeLocale", () => {
  it("accepts en or defaults to ko", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("ko")).toBe("ko");
    expect(normalizeLocale("fr")).toBe("ko");
  });
});
