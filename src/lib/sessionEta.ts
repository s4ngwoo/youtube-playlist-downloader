/** Session download ETA / dual-phase progress (pure; no Tauri). */

export type SessionTrackStatus =
  "pending" | "downloading" | "extracting" | "converting_art" | "tagging" | "completed" | "failed";

export type SessionTrackInput = {
  status: SessionTrackStatus;
  progress: number;
  eta?: string;
  speed?: string;
};

export type SessionProgress = {
  /** Formatted estimate e.g. `~3:20`, or null when unknown / postprocess-only. */
  etaDisplay: string | null;
  /** First active downloading speed string, if any. */
  speedDisplay: string | null;
  receivingCount: number;
  queuedCount: number;
  postprocessCount: number;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  /** True when only postprocess work remains (no download queue/active). */
  postprocessOnly: boolean;
  /** True when any download-phase work remains. */
  hasDownloadWork: boolean;
};

export function isPostprocessStatus(status: SessionTrackStatus): boolean {
  return status === "extracting" || status === "converting_art" || status === "tagging";
}

/** Parse yt-dlp ETA (`MM:SS` / `H:MM:SS`). `00:00` and empty → null. */
export function parseEtaToSeconds(eta: string | undefined | null): number | null {
  if (!eta) return null;
  const trimmed = eta.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;

  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;

  const sec =
    nums.length === 2 ? nums[0]! * 60 + nums[1]! : nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;

  if (sec <= 0) return null;
  return sec;
}

export function formatEtaSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `~${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  }
  return `~${m}:${r.toString().padStart(2, "0")}`;
}

/** Exponential-ish rolling mean via sample count. */
export function nextRollingAvgDownloadSec(
  prevAvg: number | null,
  sampleCount: number,
  sampleSec: number,
): { avg: number; sampleCount: number } {
  const clamped = Math.max(0.5, sampleSec);
  if (prevAvg == null || sampleCount <= 0) {
    return { avg: clamped, sampleCount: 1 };
  }
  const n = sampleCount + 1;
  const avg = prevAvg + (clamped - prevAvg) / n;
  return { avg, sampleCount: n };
}

/**
 * Estimate remaining wall-clock for the download phase only.
 * `sumRemainingSec / concurrency` where each active track contributes yt-dlp ETA
 * or `(1 - progress/100) * avg`, and each queued track contributes `avg`.
 */
export function computeSessionProgress(
  tracks: Iterable<SessionTrackInput>,
  concurrency: number,
  rollingAvgDownloadSec: number | null,
): SessionProgress {
  const C = Math.max(1, concurrency);

  let receivingCount = 0;
  let queuedCount = 0;
  let postprocessCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let totalCount = 0;

  let sumRemainingSec = 0;
  let canEstimate = true;
  let hasDownloadWork = false;
  let speedDisplay: string | null = null;

  for (const tr of tracks) {
    totalCount += 1;

    if (tr.status === "completed") {
      completedCount += 1;
      continue;
    }
    if (tr.status === "failed") {
      failedCount += 1;
      continue;
    }
    if (isPostprocessStatus(tr.status)) {
      postprocessCount += 1;
      continue;
    }
    if (tr.status === "pending") {
      queuedCount += 1;
      hasDownloadWork = true;
      if (rollingAvgDownloadSec == null || rollingAvgDownloadSec <= 0) {
        canEstimate = false;
      } else {
        sumRemainingSec += rollingAvgDownloadSec;
      }
      continue;
    }

    // downloading (and any unknown treated as download-phase)
    receivingCount += 1;
    hasDownloadWork = true;
    if (!speedDisplay && tr.speed) {
      speedDisplay = tr.speed;
    }

    const p = Math.min(100, Math.max(0, tr.progress)) / 100;
    const remFrac = 1 - p;
    const etaSec = parseEtaToSeconds(tr.eta);

    if (etaSec != null) {
      sumRemainingSec += etaSec;
    } else if (rollingAvgDownloadSec != null && rollingAvgDownloadSec > 0) {
      sumRemainingSec += remFrac * rollingAvgDownloadSec;
    } else {
      canEstimate = false;
    }
  }

  const postprocessOnly = !hasDownloadWork && postprocessCount > 0;

  let etaDisplay: string | null = null;
  if (hasDownloadWork && canEstimate && sumRemainingSec > 0) {
    etaDisplay = formatEtaSeconds(sumRemainingSec / C);
  }

  if (!hasDownloadWork) {
    speedDisplay = null;
  }

  return {
    etaDisplay,
    speedDisplay,
    receivingCount,
    queuedCount,
    postprocessCount,
    completedCount,
    failedCount,
    totalCount,
    postprocessOnly,
    hasDownloadWork,
  };
}
