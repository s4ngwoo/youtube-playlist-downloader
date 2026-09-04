use regex::Regex;

/// 다운로드 대상 파일 경로로부터 순수한 영상/음원 제목을 추출하는 유틸리티
pub fn clean_title_from_destination(raw: &str) -> String {
    let path = std::path::Path::new(raw.trim());
    let filename = path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(raw.trim());

    // .part, .ytdl 등 임시 다운로드 접미사 제거
    let mut title = filename
        .trim_end_matches(".part")
        .trim_end_matches(".ytdl")
        .trim_end_matches(".temp");

    // 확장자(.webm, .m4a, .mp4 등) 제거
    if let Some(idx) = title.rfind('.') {
        title = &title[..idx];
    }
    // yt-dlp의 임시 포맷 태그 (예: .f140, .f251 등)가 남아있다면 추가 제거
    if let Some(idx) = title.rfind(".f") {
        if title[idx + 2..].chars().all(|c| c.is_ascii_digit()) {
            title = &title[..idx];
        }
    }

    title.to_string()
}

/// yt-dlp 표준 출력(stdout) 파싱을 위한 정규식 집합
pub struct DownloadRegexes {
    pub re_playlist: Regex,
    pub re_item: Regex,
    pub re_dest: Regex,
    pub re_already: Regex,
    pub re_progress: Regex,
    pub re_speed: Regex,
    pub re_eta: Regex,
}

impl DownloadRegexes {
    pub fn new() -> Self {
        Self {
            re_playlist: Regex::new(r"\[download\] Downloading playlist:\s*(.+)").unwrap(),
            re_item: Regex::new(r"\[download\] Downloading (?:item|video)\s+(\d+)\s+of\s+(\d+)")
                .unwrap(),
            re_dest: Regex::new(r"(?:\[download\]|\[ExtractAudio\])\s+Destination:\s*(.+)").unwrap(),
            re_already: Regex::new(r"\[download\]\s+(.+)\s+has already been downloaded").unwrap(),
            re_progress: Regex::new(r"\[download\]\s+(\d+(?:\.\d+)?)%").unwrap(),
            re_speed: Regex::new(r"at\s+([\d.]+[KkMmGg]?i?B/s)").unwrap(),
            re_eta: Regex::new(r"ETA\s+([\d:]+)").unwrap(),
        }
    }
}
