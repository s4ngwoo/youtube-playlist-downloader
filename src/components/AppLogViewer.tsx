import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Trash2,
  FolderOpen,
  Filter,
  ChevronDown,
} from "lucide-react";

type LogLevel = "INFO" | "WARN" | "ERROR";
type FilterMode = "ALL" | "WARN_ERROR" | "ERROR";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  source: string;
  message: string;
}

const LEVEL_CONFIG: Record<
  LogLevel,
  { icon: typeof AlertCircle; color: string; bg: string; badge: string }
> = {
  ERROR: {
    icon: AlertCircle,
    color: "text-rose-400",
    bg: "bg-rose-950/30 border-l-2 border-rose-500",
    badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  },
  WARN: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-950/20 border-l-2 border-amber-500",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  },
  INFO: {
    icon: Info,
    color: "text-sky-400/80",
    bg: "hover:bg-neutral-800/40",
    badge: "bg-sky-500/10 text-sky-400/80 border border-sky-500/20",
  },
};

export function AppLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [logPath, setLogPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const autoScrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await invoke<LogEntry[]>("read_app_logs", {
        maxLines: 2000,
      });
      setLogs(entries);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("로그 읽기 실패:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLogPath = useCallback(async () => {
    try {
      const path = await invoke<string>("get_app_log_path");
      setLogPath(path);
    } catch (e) {
      console.error("로그 경로 읽기 실패:", e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchLogPath();
    // 30초마다 자동 갱신
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs, fetchLogPath]);

  // 에러 발생 시 자동 하단 스크롤
  useEffect(() => {
    if (autoScrollRef.current) {
      autoScrollRef.current.scrollTop = autoScrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClearLogs = async () => {
    try {
      await invoke("clear_app_logs");
      setLogs([]);
    } catch (e) {
      console.error("로그 초기화 실패:", e);
    }
  };

  const handleOpenFile = async () => {
    if (!logPath) return;
    try {
      await openPath(logPath);
    } catch (e) {
      console.error("파일 열기 실패:", e);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "ERROR") return log.level === "ERROR";
    if (filter === "WARN_ERROR")
      return log.level === "ERROR" || log.level === "WARN";
    return true;
  });

  const errorCount = logs.filter((l) => l.level === "ERROR").length;
  const warnCount = logs.filter((l) => l.level === "WARN").length;

  const filterLabels: Record<FilterMode, string> = {
    ALL: "전체",
    WARN_ERROR: "경고 이상",
    ERROR: "에러만",
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neutral-800">
            <Info className="w-4 h-4 text-sky-400/80" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">정보</p>
            <p className="text-lg font-bold text-neutral-200 leading-none mt-0.5">
              {logs.filter((l) => l.level === "INFO").length}
            </p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-950/30">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">경고</p>
            <p className="text-lg font-bold text-amber-400 leading-none mt-0.5">
              {warnCount}
            </p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-950/30">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">에러</p>
            <p className="text-lg font-bold text-rose-400 leading-none mt-0.5">
              {errorCount}
            </p>
          </div>
        </div>
      </div>

      {/* 로그 뷰어 */}
      <div className="flex-1 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-0">
        {/* 툴바 */}
        <div className="bg-neutral-950 px-4 py-2.5 border-b border-neutral-800/90 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-300 font-mono">
              앱 로그
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
              {filteredLogs.length} / {logs.length}
            </span>
            {lastRefreshed && (
              <span className="text-[10px] text-neutral-600 font-mono hidden sm:block">
                갱신: {lastRefreshed.toLocaleTimeString("ko-KR")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* 필터 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all cursor-pointer font-mono"
              >
                <Filter className="w-3 h-3" />
                {filterLabels[filter]}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[100px]">
                  {(["ALL", "WARN_ERROR", "ERROR"] as FilterMode[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                        filter === f
                          ? "bg-neutral-700 text-neutral-200"
                          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              title="새로고침"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleOpenFile}
              disabled={!logPath}
              title="로그 파일 열기"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleClearLogs}
              title="로그 초기화"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 로그 목록 */}
        <div
          ref={autoScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-3 font-mono text-xs flex flex-col gap-0.5 bg-neutral-950/80"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3">
              <Info className="w-8 h-8 opacity-30" />
              <p className="text-xs text-center">
                {logs.length === 0
                  ? "로그가 없습니다. 다운로드를 시작하면 여기에 기록됩니다."
                  : "해당 필터 조건에 맞는 로그가 없습니다."}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const cfg = LEVEL_CONFIG[log.level];
              const Icon = cfg.icon;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2 py-1 rounded transition-colors ${cfg.bg}`}
                >
                  <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${cfg.color}`} />
                  <span className="text-neutral-500 shrink-0 text-[10px] select-none pt-0.5 min-w-[130px]">
                    {log.timestamp}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.5 rounded shrink-0 font-bold ${cfg.badge}`}
                  >
                    {log.source}
                  </span>
                  <span className="flex-1 text-neutral-300 whitespace-pre-wrap break-all leading-relaxed">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* 푸터: 파일 경로 */}
        {logPath && (
          <div className="px-4 py-2 border-t border-neutral-800/50 bg-neutral-950/50 flex-shrink-0">
            <p className="text-[10px] text-neutral-600 font-mono truncate">
              📁 {logPath}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
