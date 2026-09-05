import { openUrl } from "@tauri-apps/plugin-opener";
import { Mail, FileText } from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";
import { invoke } from "@tauri-apps/api/core";

export function Footer() {
  const openLogWindow = async () => {
    try {
      await invoke("open_log_window");
    } catch (err) {
      console.error("Failed to open log window:", err);
    }
  };

  return (
    <footer className="w-full max-w-5xl mt-auto pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span>YouTube Playlist Downloader</span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-neutral-700" />
          <span>
            Developed by{" "}
            <span className="text-neutral-300 font-medium">Lee SangWoo</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openUrl("mailto:s4ngwoo.lee@gmail.com")}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="이메일 보내기"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>s4ngwoo.lee@gmail.com</span>
          </button>
          <button
            type="button"
            onClick={() => openUrl("https://github.com/s4ngwoo")}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="GitHub 프로필 열기"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>github.com/s4ngwoo</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={openLogWindow}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
        >
          <FileText className="w-3.5 h-3.5" />
          앱 로그
        </button>
      </div>
    </footer>
  );
}
