import { create } from "zustand";
import { DownloadStatus, TrackItem, LogItem } from "../types/download";

interface DownloadState {
  url: string;
  setUrl: (url: string) => void;
  downloadDir: string;
  setDownloadDir: (dir: string) => void;
  status: DownloadStatus;
  setStatus: (status: DownloadStatus) => void;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;

  playlistTitle: string;
  setPlaylistTitle: (title: string) => void;
  totalItems: number;
  setTotalItems: (count: number) => void;
  tracks: Map<number, TrackItem>;
  setTracks: (updater: (prev: Map<number, TrackItem>) => Map<number, TrackItem> | Map<number, TrackItem>) => void;

  currentSpeed: string;
  setCurrentSpeed: (speed: string) => void;
  currentEta: string;
  setCurrentEta: (eta: string) => void;

  logs: LogItem[];
  addLog: (log: Omit<LogItem, "id">) => void;
  setLogs: (logs: LogItem[]) => void;
  autoScroll: boolean;
  setAutoScroll: (autoScroll: boolean) => void;
  isConsoleCollapsed: boolean;
  setIsConsoleCollapsed: (collapsed: boolean) => void;

  isZipping: boolean;
  setIsZipping: (isZipping: boolean) => void;
  
  resetState: () => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  url: "",
  setUrl: (url) => set({ url }),
  downloadDir: "",
  setDownloadDir: (dir) => set({ downloadDir: dir }),
  status: "idle",
  setStatus: (status) => set({ status }),
  statusMessage: "다운로드 대기 중",
  setStatusMessage: (msg) => set({ statusMessage: msg }),

  playlistTitle: "",
  setPlaylistTitle: (title) => set({ playlistTitle: title }),
  totalItems: 0,
  setTotalItems: (count) => set({ totalItems: count }),
  tracks: new Map(),
  setTracks: (updater) => set((state) => {
    const nextTracks = typeof updater === 'function' ? updater(state.tracks) : updater;
    return { tracks: nextTracks };
  }),

  currentSpeed: "",
  setCurrentSpeed: (speed) => set({ currentSpeed: speed }),
  currentEta: "",
  setCurrentEta: (eta) => set({ currentEta: eta }),

  logs: [],
  addLog: (log) => set((state) => ({ logs: [...state.logs, { ...log, id: Date.now() + Math.random() }] })),
  setLogs: (logs) => set({ logs }),
  autoScroll: true,
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  isConsoleCollapsed: false,
  setIsConsoleCollapsed: (collapsed) => set({ isConsoleCollapsed: collapsed }),

  isZipping: false,
  setIsZipping: (isZipping) => set({ isZipping }),

  resetState: () => set({
    status: "downloading",
    tracks: new Map(),
    playlistTitle: "",
    totalItems: 0,
    currentSpeed: "",
    currentEta: "",
    statusMessage: "플레이리스트 및 음원 정보를 분석하는 중..."
  }),
}));
