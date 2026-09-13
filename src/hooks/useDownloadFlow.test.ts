import { describe, expect, it } from "vitest";
import { seedPendingTracks } from "./useDownloadFlow";
import type { PlaylistMetadata } from "../types/download";

const playlist: PlaylistMetadata = {
  title: "PL",
  tracks: [
    { index: 1, title: "Alpha", id: "a", url: "https://a" },
    { index: 2, title: "Beta", id: "b", url: "https://b" },
    { index: 3, title: "Gamma", id: "c", url: "https://c" },
  ],
};

describe("seedPendingTracks", () => {
  it("seeds only selected indexes as pending at 0", () => {
    const map = seedPendingTracks(
      [
        { url: "https://a", index: 1, title: "Alpha" },
        { url: "https://c", index: 3, title: "Gamma" },
      ],
      playlist,
    );
    expect([...map.keys()].sort((a, b) => a - b)).toEqual([1, 3]);
    expect(map.get(1)).toMatchObject({ title: "Alpha", progress: 0, status: "pending" });
    expect(map.has(2)).toBe(false);
  });

  it("prefers playlist title over empty or Track # fallback selection title", () => {
    const map = seedPendingTracks([{ url: "https://a", index: 1, title: "Track #01" }], playlist);
    expect(map.get(1)?.title).toBe("Alpha");
  });

  it("still seeds a missing playlist row with Track #NN", () => {
    const map = seedPendingTracks([{ url: "https://x", index: 9 }], playlist);
    expect(map.get(9)).toMatchObject({
      index: 9,
      title: "Track #09",
      status: "pending",
      progress: 0,
    });
  });
});
