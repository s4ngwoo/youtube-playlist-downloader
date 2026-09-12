import { describe, expect, it } from "vitest";
import { planDownloadSuccess, shouldIgnoreDownloadFailure } from "./downloadOutcome";

describe("planDownloadSuccess", () => {
  it("keeps Cancel and never writes history when the UI already cancelled", () => {
    expect(planDownloadSuccess("cancelled", "ok.download_complete", { saveHistory: true })).toEqual(
      {
        status: "cancelled",
        messageCode: "ok.cancelled",
        saveHistory: false,
      },
    );
  });

  it("treats the backend cancelled code as Cancel even if status is still downloading", () => {
    expect(planDownloadSuccess("downloading", "ok.cancelled", { saveHistory: true })).toEqual({
      status: "cancelled",
      messageCode: "ok.cancelled",
      saveHistory: false,
    });
  });

  it("completes and optionally records history on a real finish", () => {
    expect(
      planDownloadSuccess("downloading", "ok.download_complete", { saveHistory: true }),
    ).toEqual({
      status: "completed",
      messageCode: "ok.download_complete",
      saveHistory: true,
    });
    expect(planDownloadSuccess("downloading", "ok.download_partial:2:1")).toEqual({
      status: "completed",
      messageCode: "ok.download_partial:2:1",
      saveHistory: false,
    });
  });
});

describe("shouldIgnoreDownloadFailure", () => {
  it("swallows errors only after Cancel won the race", () => {
    expect(shouldIgnoreDownloadFailure("cancelled")).toBe(true);
    expect(shouldIgnoreDownloadFailure("downloading")).toBe(false);
    expect(shouldIgnoreDownloadFailure("error")).toBe(false);
  });
});
