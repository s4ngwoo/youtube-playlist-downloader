import { useRef, useEffect } from "react";
import { Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useDownloadStore } from "../store/downloadStore";

export function TerminalLog() {
  const { 
    logs, 
    autoScroll, 
    isConsoleCollapsed, 
    setAutoScroll, 
    setLogs, 
    setIsConsoleCollapsed 
  } = useDownloadStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  // 콘솔 자동 스크롤 처리
  useEffect(() => {
    if (autoScroll && !isConsoleCollapsed && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, isConsoleCollapsed]);

  return (
    <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      {/* 콘솔 헤더 */}
      <div className="bg-neutral-950 px-4 py-3 border-b border-neutral-800/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-300 font-mono tracking-wide">
            yt-dlp Live Output
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
            {logs.length} 라인
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-neutral-700 text-rose-600 focus:ring-0 focus:ring-offset-0 bg-neutral-900 w-3.5 h-3.5 accent-rose-500"
            />
            자동 스크롤
          </label>

          <button
            type="button"
            onClick={() => setLogs([])}
            title="로그 비우기"
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
            title={isConsoleCollapsed ? "콘솔 펼치기" : "콘솔 접기"}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition-all cursor-pointer"
          >
            {isConsoleCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 콘솔 본체 */}
      {!isConsoleCollapsed && (
        <div className="h-52 sm:h-60 p-4 font-mono text-xs overflow-y-auto custom-scrollbar flex flex-col gap-1.5 bg-neutral-950/80">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
              <Terminal className="w-8 h-8 opacity-40" />
              <p className="text-xs">
                다운로드를 시작하면 표준 출력 로그가 실시간으로 스트리밍됩니다.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2.5 leading-relaxed break-all ${
                  log.isError
                    ? "text-rose-400 bg-rose-950/20 px-2 py-1 rounded border-l-2 border-rose-500"
                    : "text-neutral-300 hover:bg-neutral-900/60 px-1 py-0.5 rounded"
                }`}
              >
                <span className="text-neutral-600 shrink-0 text-[10px] select-none pt-0.5">
                  [{log.timestamp}]
                </span>
                <span className="flex-1 whitespace-pre-wrap">{log.text}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
    </section>
  );
}
