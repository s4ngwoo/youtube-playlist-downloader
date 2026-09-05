import { openUrl } from "@tauri-apps/plugin-opener";
import { Mail, CheckCircle2, AlertCircle, ListMusic, Edit3 } from "lucide-react";
import { GithubIcon } from "./icons/GithubIcon";
import { useDownloadStore } from "../store/downloadStore";

interface HeaderProps {
  onOpenMetadataEditor?: () => void;
}

export function Header({ onOpenMetadataEditor }: HeaderProps) {
  const { status } = useDownloadStore();
  return (
    <header
      data-tauri-drag-region
      className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-neutral-800/80 gap-4 select-none cursor-default"
    >
      {/* 좌측: 로고 및 타이틀 영역 (세로 중앙 정렬 및 드래그 영역 활성화) */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-3.5"
      >
        <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-red-500 rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center shrink-0">
          <ListMusic className="w-6 h-6 text-white" />
        </div>
        <div data-tauri-drag-region className="flex flex-col justify-center">
          <h1
            data-tauri-drag-region
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent leading-tight"
          >
            YouTube Playlist & Audio Downloader
          </h1>
          <p
            data-tauri-drag-region
            className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1"
          >
            <span>Tauri v2 + yt-dlp 사이드카</span>
            <span className="inline-block w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-rose-400 font-medium">
              m4a 고음질 인코딩 & 앨범아트 자동 내장
            </span>
          </p>
        </div>
      </div>

      {/* 우측: 상태 배지 및 개발자 링크 (인터랙션 보호를 위해 data-tauri-drag-region="false" 설정) */}
      <div
        data-tauri-drag-region="false"
        className="flex items-center gap-2.5 shrink-0"
      >
        {onOpenMetadataEditor && (
          <button
            type="button"
            onClick={onOpenMetadataEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 shadow-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer text-xs font-semibold"
            title="메타데이터 에디터 열기"
          >
            <Edit3 className="w-3.5 h-3.5" />
            메타데이터 에디터
          </button>
        )}

        {/* 개발자 프로필 및 이메일 링크 */}
        <div
          data-tauri-drag-region="false"
          className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-neutral-900/80 border border-neutral-800 shadow-sm"
        >
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => openUrl("mailto:s4ngwoo.lee@gmail.com")}
            className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-all cursor-pointer"
            title="개발자 이메일 (s4ngwoo.lee@gmail.com)"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-3 bg-neutral-800" />
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => openUrl("https://github.com/s4ngwoo")}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            title="GitHub 프로필 (github.com/s4ngwoo)"
          >
            <GithubIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {status === "downloading" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            일괄 다운로드 중
          </span>
        )}
        {status === "completed" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            전체 다운로드 완료
          </span>
        )}
        {status === "cancelled" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            다운로드 중단됨
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            오류 발생
          </span>
        )}
        {status === "idle" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-800/80 text-neutral-400 border border-neutral-700/50">
            대기 중
          </span>
        )}
      </div>
    </header>
  );
}
