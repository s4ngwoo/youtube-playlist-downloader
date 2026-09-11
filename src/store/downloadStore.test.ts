import { describe, expect, it, beforeEach } from "vitest";
import { useDownloadStore } from "../store/downloadStore";

describe("beginDownloadSession", () => {
  beforeEach(() => {
    useDownloadStore.setState({
      status: "idle",
      tracks: new Map([
        [
          1,
          {
            index: 1,
            title: "old",
            progress: 50,
            status: "completed",
          },
        ],
      ]),
      playlistTitle: "Old",
      totalItems: 5,
      currentSpeed: "1MB/s",
      currentEta: "00:01",
      statusMessage: "prev",
    });
  });

  it("clears progress fields and sets downloading", () => {
    useDownloadStore.getState().beginDownloadSession();
    const s = useDownloadStore.getState();
    expect(s.status).toBe("downloading");
    expect(s.tracks.size).toBe(0);
    expect(s.playlistTitle).toBe("");
    expect(s.totalItems).toBe(0);
    expect(s.currentSpeed).toBe("");
    expect(s.currentEta).toBe("");
    expect(s.statusMessage).toBe("");
  });
});
