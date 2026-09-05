// Rust 백엔드로부터 수신할 이벤트 페이로드 인터페이스 (플레이리스트 확장 필드 포함)
export interface ProgressPayload {
  line?: string;
  message?: string;
  is_error: boolean;
  playlist_title?: string;
  item_index?: number;
  total_items?: number;
  item_title?: string;
  track_progress?: number;
  track_status?:
    | "pending"
    | "downloading"
    | "extracting"
    | "converting_art"
    | "tagging"
    | "completed"
    | "failed";
  speed?: string;
  eta?: string;
  error_message?: string;
}

// 개별 트랙 상태 인터페이스
export interface TrackItem {
  index: number;
  title: string;
  progress: number;
  status:
    | "pending"
    | "downloading"
    | "extracting"
    | "converting_art"
    | "tagging"
    | "completed"
    | "failed";
  speed?: string;
  eta?: string;
  error_message?: string;
}

// 콘솔 로그 항목 인터페이스
export interface LogItem {
  id: number;
  text: string;
  isError: boolean;
  timestamp: string;
}

// 전체 다운로드 상태
export type DownloadStatus = "idle" | "downloading" | "completed" | "error" | "cancelled";

// 창 크기 동적 조절 옵션
export interface WindowResizeOptions {
  minHeight?: number;
  maxHeight?: number;
  padding?: number;
  threshold?: number;
  debounceMs?: number;
}

// 오디오 메타데이터 (Lofty 연동용)
export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  lyrics?: string;
  cover_art_base64?: string;
  comment?: string;
  custom_tags?: Record<string, string>;
}

export interface AudioFileEntry {
  file_name: string;
  file_path: string;
  metadata: AudioMetadata;
}
