import { describe, expect, it } from "vitest";
import { summarizeSkippedTracks, type SkippedTrack } from "./skippedTracks";

describe("summarizeSkippedTracks", () => {
  it("returns empty summary when none", () => {
    expect(summarizeSkippedTracks([])).toEqual({
      total: 0,
      privateCount: 0,
      deletedCount: 0,
      unknownCount: 0,
    });
  });

  it("counts by reason", () => {
    const skipped: SkippedTrack[] = [
      { index: 1, title: "[Private video]", reason: "private" },
      { index: 2, title: "[Deleted video]", reason: "deleted" },
      { index: 3, title: "?", reason: "unknown" },
      { index: 4, title: "x", reason: "private" },
    ];
    expect(summarizeSkippedTracks(skipped)).toEqual({
      total: 4,
      privateCount: 2,
      deletedCount: 1,
      unknownCount: 1,
    });
  });
});
