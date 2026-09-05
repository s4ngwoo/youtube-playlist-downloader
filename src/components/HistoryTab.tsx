import { useState, useEffect } from "react";
import { DownloadHistoryItem } from "../types/history";
import { Trash2, Download, Clock } from "lucide-react";

interface HistoryTabProps {
  onLoadUrl: (url: string) => void;
}

export function HistoryTab({ onLoadUrl }: HistoryTabProps) {
  const [historyItems, setHistoryItems] = useState<DownloadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const storePl = await load("history.json");
      const entries = await storePl.entries<DownloadHistoryItem>();
      
      const items = entries.map(([_, value]) => value);
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setHistoryItems(items);
    } catch (err) {
      console.error("히스토리 불러오기 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (url: string) => {
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const storePl = await load("history.json");
      await storePl.delete(url);
      await storePl.save();
      
      setHistoryItems((prev) => prev.filter((item) => item.url !== url));
    } catch (err) {
      console.error("히스토리 삭제 실패:", err);
      alert("항목 삭제에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 w-full bg-neutral-900 rounded-xl border border-neutral-800">
        <div className="text-neutral-400">불러오는 중...</div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-48 w-full bg-neutral-900 rounded-xl border border-neutral-800 text-neutral-400">
        <Clock className="w-8 h-8 mb-3 opacity-50" />
        <div>다운로드 기록이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-neutral-900 rounded-xl border border-neutral-800 p-4 md:p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">다운로드 기록</h2>
        <span className="text-sm text-neutral-500">총 {historyItems.length}개 항목</span>
      </div>
      
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {historyItems.map((item) => (
          <div key={item.url} className="flex flex-col sm:flex-row gap-4 p-4 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="flex-1 min-w-0">
              <h3 className="text-neutral-200 font-medium truncate" title={item.title || "제목 없음"}>
                {item.title || "제목 없음"}
              </h3>
              <p className="text-neutral-500 text-sm truncate mt-1" title={item.url}>
                {item.url}
              </p>
              <p className="text-neutral-600 text-xs mt-2">
                {new Date(item.date).toLocaleString()}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onLoadUrl(item.url)}
                className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors text-sm whitespace-nowrap"
                title="다시 다운로드 화면으로 이동"
              >
                <Download className="w-4 h-4" />
                <span>재다운로드</span>
              </button>
              <button
                onClick={() => handleDelete(item.url)}
                className="p-2 bg-neutral-800 hover:bg-red-900/50 hover:text-red-400 text-neutral-400 rounded-md transition-colors"
                title="기록 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
