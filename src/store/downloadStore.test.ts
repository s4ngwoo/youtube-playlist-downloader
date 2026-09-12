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
      avgDownloadSec: 42,
      downloadSampleCount: 3,
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
    expect(s.avgDownloadSec).toBeNull();
    expect(s.downloadSampleCount).toBe(0);
    expect(s.statusMessage).toBe("");
  });

  it("beginDownloadInvoke isolates a later run from a stale invoke", () => {
    const first = useDownloadStore.getState().beginDownloadInvoke();
    const second = useDownloadStore.getState().beginDownloadInvoke();
    expect(second).toBe(first + 1);
    expect(useDownloadStore.getState().downloadInvokeId).toBe(second);
    expect(first).not.toBe(second);
  });

  it("recordDownloadSample updates rolling average", () => {
    useDownloadStore.getState().beginDownloadSession();
    useDownloadStore.getState().recordDownloadSample(10);
    useDownloadStore.getState().recordDownloadSample(20);
    const s = useDownloadStore.getState();
    expect(s.downloadSampleCount).toBe(2);
    expect(s.avgDownloadSec).toBe(15);
  });
});
