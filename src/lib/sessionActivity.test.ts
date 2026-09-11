import { describe, expect, it } from "vitest";
import { describeSessionActivity } from "./sessionActivity";

describe("describeSessionActivity", () => {
  it("reports preparing when all pending", () => {
    expect(
      describeSessionActivity({
        receiving: 0,
        queued: 5,
        postprocess: 0,
        completed: 0,
        failed: 0,
        total: 5,
      }),
    ).toEqual({ key: "status.preparingDownloads", vars: { count: 5 } });
  });

  it("reports receiving with queue", () => {
    expect(
      describeSessionActivity({
        receiving: 2,
        queued: 3,
        postprocess: 0,
        completed: 1,
        failed: 0,
        total: 6,
      }),
    ).toEqual({
      key: "status.activityReceiving",
      vars: { recv: 2, queued: 3, total: 6 },
    });
  });

  it("reports postprocess-only", () => {
    expect(
      describeSessionActivity({
        receiving: 0,
        queued: 0,
        postprocess: 2,
        completed: 4,
        failed: 0,
        total: 6,
      }),
    ).toEqual({ key: "status.activityPostprocess", vars: { count: 2 } });
  });

  it("reports mixed receive + postprocess", () => {
    expect(
      describeSessionActivity({
        receiving: 1,
        queued: 0,
        postprocess: 2,
        completed: 3,
        failed: 0,
        total: 6,
      }),
    ).toEqual({
      key: "status.activityMixed",
      vars: { recv: 1, post: 2 },
    });
  });
});
