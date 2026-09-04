import { openUrl } from "@tauri-apps/plugin-opener";
import { Mail } from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";

export function Footer() {
  return (
    <footer className="w-full max-w-5xl mt-6 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
      <div className="flex items-center gap-2">
        <span>YouTube Playlist Downloader</span>
        <span className="inline-block w-1 h-1 rounded-full bg-neutral-700" />
        <span>
          Developed by{" "}
          <span className="text-neutral-300 font-medium">Lee SangWoo</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => openUrl("mailto:s4ngwoo.lee@gmail.com")}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
          title="이메일 보내기"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>s4ngwoo.lee@gmail.com</span>
        </button>
        <span className="w-1 h-1 rounded-full bg-neutral-700" />
        <button
          type="button"
          onClick={() => openUrl("https://github.com/s4ngwoo")}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="GitHub 프로필 열기"
        >
          <GithubIcon className="w-3.5 h-3.5" />
          <span>github.com/s4ngwoo</span>
        </button>
      </div>
    </footer>
  );
}
