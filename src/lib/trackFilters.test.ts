import { describe, expect, it } from "vitest";
import { filterTracksByStatus } from "./trackFilters";

describe("filterTracksByStatus", () => {
  const tracks = [
    { index: 1, status: "completed" as const },
    { index: 2, status: "failed" as const },
    { index: 3, status: "downloading" as const },
    { index: 4, status: "failed" as const },
  ];

  it("returns all when mode is all", () => {
    expect(filterTracksByStatus(tracks, "all").map((t) => t.index)).toEqual([1, 2, 3, 4]);
  });

  it("returns only failed when mode is failed", () => {
    expect(filterTracksByStatus(tracks, "failed").map((t) => t.index)).toEqual([2, 4]);
  });
});
