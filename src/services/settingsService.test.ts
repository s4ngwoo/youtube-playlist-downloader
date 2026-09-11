import { describe, expect, it } from "vitest";
import { mergeSettings } from "../services/settingsService";
import { DEFAULT_SETTINGS } from "../types/settings";

describe("mergeSettings", () => {
  it("fills defaults for empty partial", () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps concurrency and normalizes format/locale", () => {
    const merged = mergeSettings({
      downloadDir: "/tmp",
      concurrency: 99,
      audioFormat: "mp3",
      locale: "en",
    });
    expect(merged.downloadDir).toBe("/tmp");
    expect(merged.concurrency).toBe(8);
    expect(merged.audioFormat).toBe("mp3");
    expect(merged.locale).toBe("en");
  });
});
