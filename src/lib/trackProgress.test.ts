import { describe, expect, it } from "vitest";
import {
  mergeTrackTitle,
  sortTracksForDisplay,
  type SortableTrack,
} from "./trackProgress";

describe("mergeTrackTitle", () => {
  it("keeps existing real title when incoming is empty", () => {
    expect(mergeTrackTitle("Real Song", undefined, 4)).toBe("Real Song");
    expect(mergeTrackTitle("Real Song", "", 4)).toBe("Real Song");
    expect(mergeTrackTitle("Real Song", "   ", 4)).toBe("Real Song");
  });

  it("prefers non-empty incoming over existing", () => {
    expect(mergeTrackTitle("Old", "New Title", 1)).toBe("New Title");
  });

  it("falls back to Track #NN only when both missing", () => {
    expect(mergeTrackTitle(undefined, undefined, 4)).toBe("Track #04");
    expect(mergeTrackTitle("", null, 12)).toBe("Track #12");
  });

  it("does not replace a real title with a generic Track # fallback incoming", () => {
    expect(mergeTrackTitle("Real Song", "Track #04", 4)).toBe("Real Song");
    expect(mergeTrackTitle("Real Song", "트랙 #04", 4)).toBe("Real Song");
  });
});

describe("sortTracksForDisplay", () => {
  const tracks: SortableTrack[] = [
    { index: 1, status: "completed" },
    { index: 2, status: "failed" },
    { index: 3, status: "downloading" },
    { index: 4, status: "pending" },
    { index: 5, status: "extracting" },
    { index: 6, status: "failed" },
    { index: 7, status: "tagging" },
  ];

  it("pins failed first, then active download, postprocess, pending, completed", () => {
    expect(sortTracksForDisplay(tracks).map((t) => t.index)).toEqual([2, 6, 3, 5, 7, 4, 1]);
  });

  it("is stable by index within the same status group", () => {
    const failed = sortTracksForDisplay([
      { index: 9, status: "failed" },
      { index: 2, status: "failed" },
      { index: 5, status: "failed" },
    ]);
    expect(failed.map((t) => t.index)).toEqual([2, 5, 9]);
  });
});
