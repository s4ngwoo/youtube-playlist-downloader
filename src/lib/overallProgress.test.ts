import { describe, expect, it } from "vitest";
import {
  computeOverallPercent,
  smoothOverallPercent,
  trackDisplayProgress,
} from "./overallProgress";

describe("trackDisplayProgress", () => {
  it("maps download 0–100 into 0–90", () => {
    expect(trackDisplayProgress({ status: "downloading", progress: 0 })).toBe(0);
    expect(trackDisplayProgress({ status: "downloading", progress: 100 })).toBe(90);
    expect(trackDisplayProgress({ status: "downloading", progress: 50 })).toBe(45);
  });

  it("maps postprocess into 90–99 band", () => {
    expect(trackDisplayProgress({ status: "extracting", progress: 92 })).toBeGreaterThanOrEqual(90);
    expect(trackDisplayProgress({ status: "tagging", progress: 98 })).toBeLessThan(100);
  });

  it("completed is 100, pending is 0", () => {
    expect(trackDisplayProgress({ status: "completed", progress: 100 })).toBe(100);
    expect(trackDisplayProgress({ status: "pending", progress: 0 })).toBe(0);
  });
});

describe("computeOverallPercent", () => {
  it("averages display progress", () => {
    const p = computeOverallPercent([
      { status: "completed", progress: 100 },
      { status: "downloading", progress: 50 },
    ]);
    expect(p).toBeCloseTo((100 + 45) / 2, 5);
  });
});

describe("smoothOverallPercent", () => {
  it("does not jump backward on small regressions", () => {
    expect(smoothOverallPercent(40, 38)).toBe(40);
    expect(smoothOverallPercent(40, 41)).toBe(41);
  });

  it("allows reset when next is near zero from high", () => {
    expect(smoothOverallPercent(80, 0)).toBe(0);
  });
});
