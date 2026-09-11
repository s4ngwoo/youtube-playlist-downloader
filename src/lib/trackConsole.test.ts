import { describe, expect, it } from "vitest";
import { pushTrackConsoleLine, TRACK_CONSOLE_MAX_LINES } from "./trackConsole";

describe("pushTrackConsoleLine", () => {
  it("ignores empty lines", () => {
    expect(pushTrackConsoleLine(undefined, "  ")).toEqual([]);
    expect(pushTrackConsoleLine(["a"], "")).toEqual(["a"]);
  });

  it("appends and trims to max", () => {
    let lines: string[] | undefined;
    for (let i = 1; i <= TRACK_CONSOLE_MAX_LINES + 2; i++) {
      lines = pushTrackConsoleLine(lines, `line ${i}`, TRACK_CONSOLE_MAX_LINES);
    }
    expect(lines).toHaveLength(TRACK_CONSOLE_MAX_LINES);
    expect(lines?.[0]).toBe("line 3");
    expect(lines?.[lines.length - 1]).toBe(`line ${TRACK_CONSOLE_MAX_LINES + 2}`);
  });

  it("skips exact duplicate of last line", () => {
    const once = pushTrackConsoleLine(undefined, "[download] 10%");
    const twice = pushTrackConsoleLine(once, "[download] 10%");
    expect(twice).toEqual(["[download] 10%"]);
  });

  it("strips CR from yt-dlp progress rewrites", () => {
    expect(pushTrackConsoleLine(undefined, "foo\r")).toEqual(["foo"]);
  });
});
