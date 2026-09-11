import { describe, expect, it } from "vitest";
import { isCancelledDownloadOutcome } from "./download";

describe("isCancelledDownloadOutcome", () => {
  it("keeps an in-flight cancel even if the backend reports success", () => {
    expect(isCancelledDownloadOutcome("cancelled", "ok.download_complete")).toBe(
      true
    );
  });

  it("treats the backend cancelled code as cancel regardless of UI status", () => {
    expect(isCancelledDownloadOutcome("downloading", "ok.cancelled")).toBe(true);
    expect(isCancelledDownloadOutcome("idle", "ok.cancelled")).toBe(true);
  });

  it("does not swallow completed or failed jobs", () => {
    expect(isCancelledDownloadOutcome("completed", "ok.download_complete")).toBe(
      false
    );
    expect(isCancelledDownloadOutcome("error", "error.all_failed")).toBe(false);
    expect(isCancelledDownloadOutcome("downloading", "ok.download_complete")).toBe(
      false
    );
  });
});
