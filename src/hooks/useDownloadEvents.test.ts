import { describe, expect, it } from "vitest";
import { resolveTrackStatus } from "./useDownloadEvents";
import type { ProgressPayload } from "../types/download";

const payload = (over: Partial<ProgressPayload> = {}): ProgressPayload => ({
  is_error: false,
  ...over,
});

describe("resolveTrackStatus", () => {
  it("maps known backend statuses 1:1", () => {
    expect(resolveTrackStatus(payload({ track_status: "completed" }))).toBe("completed");
    expect(resolveTrackStatus(payload({ track_status: "tagging" }))).toBe("tagging");
    expect(resolveTrackStatus(payload({ track_status: "converting_art" }))).toBe("converting_art");
    expect(resolveTrackStatus(payload({ track_status: "extracting" }))).toBe("extracting");
    expect(resolveTrackStatus(payload({ track_status: "failed" }))).toBe("failed");
    expect(resolveTrackStatus(payload({ track_status: "pending" }))).toBe("pending");
  });

  it("maps backend downloaded at 100% to extracting (parser contract)", () => {
    expect(
      resolveTrackStatus(payload({ track_status: "downloaded", track_progress: 100 })),
    ).toBe("extracting");
  });

  it("treats progress >= 100 without a known status as extracting", () => {
    expect(resolveTrackStatus(payload({ track_progress: 100 }))).toBe("extracting");
  });

  it("treats mid-download or unknown status as downloading", () => {
    expect(
      resolveTrackStatus(payload({ track_status: "downloading", track_progress: 45.3 })),
    ).toBe("downloading");
    expect(resolveTrackStatus(payload({ track_progress: 12 }))).toBe("downloading");
    expect(resolveTrackStatus(payload({}))).toBe("downloading");
  });
});
