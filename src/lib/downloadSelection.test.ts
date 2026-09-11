import { describe, expect, it } from "vitest";
import { selectTracksByIndices } from "./downloadSelection";

describe("selectTracksByIndices", () => {
  const tracks = [
    { url: "https://a", index: 1 },
    { url: "https://b", index: 2 },
    { url: "https://c", index: 3 },
  ];

  it("filters by index list for download/retry", () => {
    expect(selectTracksByIndices(tracks, [1, 3])).toEqual([
      { url: "https://a", index: 1 },
      { url: "https://c", index: 3 },
    ]);
  });

  it("returns empty for no matches", () => {
    expect(selectTracksByIndices(tracks, [9])).toEqual([]);
  });
});
