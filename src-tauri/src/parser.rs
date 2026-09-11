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
    pub re_error: Regex,
}

impl Default for DownloadRegexes {
    fn default() -> Self {
        Self::new()
    }
}

impl DownloadRegexes {
    pub fn new() -> Self {
        Self {
            re_playlist: Regex::new(r"\[download\] Downloading playlist:\s*(.+)").unwrap(),
            re_item: Regex::new(r"\[download\] Downloading (?:item|video)\s+(\d+)\s+of\s+(\d+)")
                .unwrap(),
            re_dest: Regex::new(r"(?:\[download\]|\[ExtractAudio\])\s+Destination:\s*(.+)")
                .unwrap(),
            re_already: Regex::new(r"\[download\]\s+(.+)\s+has already been downloaded").unwrap(),
            re_progress: Regex::new(r"\[download\]\s+(\d+(?:\.\d+)?)%").unwrap(),
            re_speed: Regex::new(r"at\s+([\d.]+[KkMmGg]?i?B/s)").unwrap(),
            re_eta: Regex::new(r"ETA\s+([\d:]+)").unwrap(),
            re_error: Regex::new(r"ERROR:\s*(.+)").unwrap(),
        }
    }
}

/// Mutable parse state for a single yt-dlp stdout stream.
#[derive(Debug, Clone, Default)]
pub struct ProgressParseState {
    pub item_title: Option<String>,
    pub track_status: Option<String>,
    pub track_progress: Option<f32>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub playlist_title: Option<String>,
}

/// Apply one yt-dlp stdout line to progress state (pure; no IPC).
pub fn apply_ytdlp_stdout_line(
    line: &str,
    regexes: &DownloadRegexes,
    state: &mut ProgressParseState,
) {
    if let Some(caps) = regexes.re_playlist.captures(line) {
        state.playlist_title = Some(caps[1].trim().to_string());
    }

    if let Some(caps) = regexes.re_dest.captures(line) {
        state.item_title = Some(clean_title_from_destination(&caps[1]));
    }

    if let Some(caps) = regexes.re_already.captures(line) {
        state.item_title = Some(clean_title_from_destination(&caps[1]));
        state.track_status = Some("completed".to_string());
        state.track_progress = Some(100.0);
    }

    if line.contains("[ExtractAudio]") {
        state.track_status = Some("extracting".to_string());
        state.track_progress = Some(92.0);
    } else if line.contains("[ThumbnailsConvertor]") {
        state.track_status = Some("converting_art".to_string());
        state.track_progress = Some(95.0);
    } else if line.contains("[EmbedThumbnail]") || line.contains("[Metadata]") {
        state.track_status = Some("tagging".to_string());
        state.track_progress = Some(98.0);
    }

    if let Some(caps) = regexes.re_progress.captures(line) {
        if let Ok(p) = caps[1].parse::<f32>() {
            state.track_progress = Some(p);
            if p >= 100.0 {
                state.track_status = Some("downloaded".to_string());
            } else {
                state.track_status = Some("downloading".to_string());
            }
        }
    }

    if line.contains("Deleting original file") {
        state.track_status = Some("completed".to_string());
        state.track_progress = Some(100.0);
    }

    if let Some(caps) = regexes.re_speed.captures(line) {
        state.speed = Some(caps[1].to_string());
    }
    if let Some(caps) = regexes.re_eta.captures(line) {
        state.eta = Some(caps[1].to_string());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_title_strips_extension_and_part_suffix() {
        assert_eq!(
            clean_title_from_destination("/tmp/My Song.m4a.part"),
            "My Song"
        );
        assert_eq!(
            clean_title_from_destination("Artist - Track.m4a"),
            "Artist - Track"
        );
    }

    #[test]
    fn clean_title_strips_ytdlp_format_tag() {
        assert_eq!(clean_title_from_destination("/dl/Hello.f140.m4a"), "Hello");
        assert_eq!(clean_title_from_destination("Clip.f251.webm.part"), "Clip");
    }

    #[test]
    fn progress_regex_captures_percent() {
        let re = DownloadRegexes::new();
        let caps = re
            .re_progress
            .captures("[download]  45.3% of ~10.00MiB at  1.20MiB/s ETA 00:04")
            .expect("progress match");
        assert_eq!(&caps[1], "45.3");
    }

    #[test]
    fn item_regex_captures_indexes() {
        let re = DownloadRegexes::new();
        let caps = re
            .re_item
            .captures("[download] Downloading item 3 of 12")
            .expect("item match");
        assert_eq!(&caps[1], "3");
        assert_eq!(&caps[2], "12");
    }

    #[test]
    fn apply_stdout_line_updates_progress_and_playlist() {
        let re = DownloadRegexes::new();
        let mut state = ProgressParseState {
            track_progress: Some(0.0),
            track_status: Some("downloading".into()),
            ..Default::default()
        };
        apply_ytdlp_stdout_line("[download] Downloading playlist: My List", &re, &mut state);
        assert_eq!(state.playlist_title.as_deref(), Some("My List"));

        apply_ytdlp_stdout_line(
            "[download]  45.3% of ~10.00MiB at  1.20MiB/s ETA 00:04",
            &re,
            &mut state,
        );
        assert_eq!(state.track_progress, Some(45.3));
        assert_eq!(state.track_status.as_deref(), Some("downloading"));
        assert_eq!(state.speed.as_deref(), Some("1.20MiB/s"));
        assert_eq!(state.eta.as_deref(), Some("00:04"));

        apply_ytdlp_stdout_line("[ExtractAudio] Destination: /tmp/Song.m4a", &re, &mut state);
        assert_eq!(state.track_status.as_deref(), Some("extracting"));
        assert_eq!(state.item_title.as_deref(), Some("Song"));
    }
}
