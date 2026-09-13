import { describe, expect, it } from "vitest";
import {
  computeSessionProgress,
  formatEtaSeconds,
  nextRollingAvgDownloadSec,
  parseEtaToSeconds,
} from "./sessionEta";

describe("parseEtaToSeconds", () => {
  it("parses MM:SS and H:MM:SS", () => {
    expect(parseEtaToSeconds("3:20")).toBe(200);
    expect(parseEtaToSeconds("1:02:03")).toBe(3723);
  });

  it("rejects empty and 00:00", () => {
    expect(parseEtaToSeconds("")).toBeNull();
    expect(parseEtaToSeconds("00:00")).toBeNull();
    expect(parseEtaToSeconds("0:00")).toBeNull();
    expect(parseEtaToSeconds(undefined)).toBeNull();
  });

  it("rejects malformed or negative ETA text", () => {
    expect(parseEtaToSeconds("soon")).toBeNull();
    expect(parseEtaToSeconds("1:02:03:04")).toBeNull();
    expect(parseEtaToSeconds("-1:00")).toBeNull();
    expect(parseEtaToSeconds("NaN:10")).toBeNull();
  });
});

describe("formatEtaSeconds", () => {
  it("formats with tilde", () => {
    expect(formatEtaSeconds(200)).toBe("~3:20");
    expect(formatEtaSeconds(3723)).toBe("~1:02:03");
  });
});

describe("nextRollingAvgDownloadSec", () => {
  it("seeds then blends", () => {
    const a = nextRollingAvgDownloadSec(null, 0, 10);
    expect(a).toEqual({ avg: 10, sampleCount: 1 });
    const b = nextRollingAvgDownloadSec(a.avg, a.sampleCount, 20);
    expect(b.sampleCount).toBe(2);
    expect(b.avg).toBe(15);
  });
});

describe("computeSessionProgress", () => {
  it("hides ETA when no avg and no valid per-track ETA", () => {
    const p = computeSessionProgress(
      [{ status: "downloading", progress: 40, eta: "00:00" }],
      3,
      null,
    );
    expect(p.etaDisplay).toBeNull();
    expect(p.hasDownloadWork).toBe(true);
    expect(p.receivingCount).toBe(1);
  });

  it("estimates from yt-dlp ETA / concurrency", () => {
    const p = computeSessionProgress(
      [
        { status: "downloading", progress: 50, eta: "2:00", speed: "1.0MiB/s" },
        { status: "downloading", progress: 10, eta: "4:00" },
      ],
      2,
      null,
    );
    // (120 + 240) / 2 = 180 → ~3:00
    expect(p.etaDisplay).toBe("~3:00");
    expect(p.speedDisplay).toBe("1.0MiB/s");
  });

  it("uses rolling avg for queued and partial download without ETA", () => {
    const p = computeSessionProgress(
      [
        { status: "downloading", progress: 50 },
        { status: "pending", progress: 0 },
      ],
      2,
      100,
    );
    // (0.5*100 + 100) / 2 = 75 → ~1:15
    expect(p.etaDisplay).toBe("~1:15");
    expect(p.queuedCount).toBe(1);
    expect(p.receivingCount).toBe(1);
  });

  it("postprocess-only hides ETA and reports count", () => {
    const p = computeSessionProgress(
      [
        { status: "extracting", progress: 92 },
        { status: "tagging", progress: 98 },
        { status: "completed", progress: 100 },
      ],
      3,
      60,
    );
    expect(p.postprocessOnly).toBe(true);
    expect(p.etaDisplay).toBeNull();
    expect(p.speedDisplay).toBeNull();
    expect(p.postprocessCount).toBe(2);
    expect(p.hasDownloadWork).toBe(false);
  });

  it("all-failed playlist hides ETA and is not postprocess-only", () => {
    const p = computeSessionProgress(
      [
        { status: "failed", progress: 0 },
        { status: "failed", progress: 0 },
      ],
      3,
      90,
    );
    expect(p.failedCount).toBe(2);
    expect(p.hasDownloadWork).toBe(false);
    expect(p.postprocessOnly).toBe(false);
    expect(p.etaDisplay).toBeNull();
    expect(p.speedDisplay).toBeNull();
  });

  it("ignores postprocess fake percent for ETA", () => {
    const p = computeSessionProgress(
      [
        { status: "downloading", progress: 80, eta: "0:40" },
        { status: "extracting", progress: 92, eta: "00:00" },
      ],
      1,
      50,
    );
    expect(p.etaDisplay).toBe("~0:40");
    expect(p.postprocessCount).toBe(1);
  });
});
