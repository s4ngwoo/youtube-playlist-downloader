import { create } from "zustand";
import { DownloadStatus, TrackItem, LogItem } from "../types/download";
import { AudioFormat, DEFAULT_SETTINGS, clampConcurrency } from "../types/settings";
import { nextRollingAvgDownloadSec } from "../lib/sessionEta";

interface DownloadState {
  url: string;
  setUrl: (url: string) => void;
  downloadDir: string;
  setDownloadDir: (dir: string) => void;
  concurrency: number;
  setConcurrency: (n: number) => void;
  audioFormat: AudioFormat;
  setAudioFormat: (format: AudioFormat) => void;

  status: DownloadStatus;
  setStatus: (status: DownloadStatus) => void;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;

  playlistTitle: string;
  setPlaylistTitle: (title: string) => void;
  totalItems: number;
  setTotalItems: (count: number) => void;
  tracks: Map<number, TrackItem>;
  setTracks: (
    updater: ((prev: Map<number, TrackItem>) => Map<number, TrackItem>) | Map<number, TrackItem>,
  ) => void;

  currentSpeed: string;
  setCurrentSpeed: (speed: string) => void;
  currentEta: string;
  setCurrentEta: (eta: string) => void;

  /** Rolling mean of download-phase duration (seconds) for session ETA. */
  avgDownloadSec: number | null;
  downloadSampleCount: number;
  recordDownloadSample: (sampleSec: number) => void;

  logs: LogItem[];
  addLog: (log: Omit<LogItem, "id">) => void;
  setLogs: (logs: LogItem[]) => void;
  autoScroll: boolean;
  setAutoScroll: (autoScroll: boolean) => void;
  isConsoleCollapsed: boolean;
  setIsConsoleCollapsed: (collapsed: boolean) => void;

  isZipping: boolean;
  setIsZipping: (isZipping: boolean) => void;

  isFetchingMetadata: boolean;
  setIsFetchingMetadata: (v: boolean) => void;

  isSelectionModalOpen: boolean;
  setIsSelectionModalOpen: (v: boolean) => void;

  fetchedPlaylist: import("../types/download").PlaylistMetadata | null;
  setFetchedPlaylist: (v: import("../types/download").PlaylistMetadata | null) => void;

  /** Start a new download run (clears tracks/progress; status → downloading). */
  beginDownloadSession: () => void;

  /**
   * Monotonic id for the in-flight `download_audio` invoke. Stale completions
   * from a cancelled job must not overwrite a newer run.
   */
  downloadInvokeId: number;
  beginDownloadInvoke: () => number;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  url: "",
  setUrl: (url) => set({ url }),
  downloadDir: "",
  setDownloadDir: (dir) => set({ downloadDir: dir }),
  concurrency: DEFAULT_SETTINGS.concurrency,
  setConcurrency: (n) => set({ concurrency: clampConcurrency(n) }),
  audioFormat: DEFAULT_SETTINGS.audioFormat,
  setAudioFormat: (audioFormat) => set({ audioFormat }),

  status: "idle",
  setStatus: (status) => set({ status }),
  statusMessage: "Waiting to download",
  setStatusMessage: (msg) => set({ statusMessage: msg }),

  playlistTitle: "",
  setPlaylistTitle: (title) => set({ playlistTitle: title }),
  totalItems: 0,
  setTotalItems: (count) => set({ totalItems: count }),
  tracks: new Map(),
  setTracks: (updater) =>
    set((state) => {
      const nextTracks = typeof updater === "function" ? updater(state.tracks) : updater;
      return { tracks: nextTracks };
    }),

  currentSpeed: "",
  setCurrentSpeed: (speed) => set({ currentSpeed: speed }),
  currentEta: "",
  setCurrentEta: (eta) => set({ currentEta: eta }),

  avgDownloadSec: null,
  downloadSampleCount: 0,
  recordDownloadSample: (sampleSec) =>
    set((state) => {
      const next = nextRollingAvgDownloadSec(
        state.avgDownloadSec,
        state.downloadSampleCount,
        sampleSec,
      );
      return { avgDownloadSec: next.avg, downloadSampleCount: next.sampleCount };
    }),

  logs: [],
  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, { ...log, id: Date.now() + Math.random() }],
    })),
  setLogs: (logs) => set({ logs }),
  autoScroll: true,
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  isConsoleCollapsed: false,
  setIsConsoleCollapsed: (collapsed) => set({ isConsoleCollapsed: collapsed }),

  isZipping: false,
  setIsZipping: (isZipping) => set({ isZipping }),

  isFetchingMetadata: false,
  setIsFetchingMetadata: (v) => set({ isFetchingMetadata: v }),

  isSelectionModalOpen: false,
  setIsSelectionModalOpen: (v) => set({ isSelectionModalOpen: v }),

  fetchedPlaylist: null,
  setFetchedPlaylist: (v) => set({ fetchedPlaylist: v }),

  beginDownloadSession: () =>
    set({
      status: "downloading",
      tracks: new Map(),
      playlistTitle: "",
      totalItems: 0,
      currentSpeed: "",
      currentEta: "",
      avgDownloadSec: null,
      downloadSampleCount: 0,
      statusMessage: "",
    }),

  downloadInvokeId: 0,
  beginDownloadInvoke: () => {
    let nextId = 0;
    set((state) => {
      nextId = state.downloadInvokeId + 1;
      return { downloadInvokeId: nextId };
    });
    return nextId;
  },
}));
