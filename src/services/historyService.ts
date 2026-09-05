import { DownloadHistoryItem } from "../types/history";

const HISTORY_STORE_FILE = "history.json";

// Tauri Store 인스턴스 지연 초기화 및 캐싱
let storePromise: Promise<import("@tauri-apps/plugin-store").Store> | null = null;

async function getStore() {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) =>
      load(HISTORY_STORE_FILE)
    );
  }
  return storePromise;
}

export const historyService = {
  /**
   * 저장된 모든 다운로드 기록을 최신순으로 정렬하여 반환합니다.
   */
  async getHistory(): Promise<DownloadHistoryItem[]> {
    try {
      const store = await getStore();
      const entries = await store.entries<DownloadHistoryItem>();
      const items = entries.map(([_, value]) => value);
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items;
    } catch (err) {
      console.error("히스토리 불러오기 실패:", err);
      return [];
    }
  },

  /**
   * 특정 URL이 이전에 다운로드된 적이 있는지 확인합니다.
   */
  async hasHistory(url: string): Promise<boolean> {
    try {
      const store = await getStore();
      const entry = await store.get<DownloadHistoryItem>(url);
      return Boolean(entry);
    } catch (err) {
      console.warn("히스토리 확인 실패:", err);
      return false;
    }
  },

  /**
   * 다운로드 완료된 항목을 기록에 저장합니다.
   */
  async saveHistory(url: string, title: string): Promise<void> {
    try {
      const store = await getStore();
      await store.set(url, {
        url,
        title: title || "Unknown Title",
        date: new Date().toISOString(),
      });
      await store.save();
    } catch (err) {
      console.warn("히스토리 저장 실패:", err);
    }
  },

  /**
   * 특정 URL 기록을 삭제합니다.
   */
  async deleteHistory(url: string): Promise<boolean> {
    try {
      const store = await getStore();
      await store.delete(url);
      await store.save();
      return true;
    } catch (err) {
      console.error("히스토리 삭제 실패:", err);
      return false;
    }
  },
};
