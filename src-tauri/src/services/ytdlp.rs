use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::models::{DownloadTask, ProgressPayload, YtDlpDump};
use crate::parser::{apply_ytdlp_stdout_line, DownloadRegexes, ProgressParseState};
use crate::process::AppState;
use crate::services::{environment, logger, ytdlp_update};

fn open_ytdlp(
    app: &tauri::AppHandle,
) -> Result<tauri_plugin_shell::process::Command, crate::AppError> {
    if let Ok(path) = ytdlp_update::override_binary_path(app) {
        if path.is_file() {
            logger::info(
                "ytdlp",
                &format!("오버라이드 yt-dlp 사용: {}", path.display()),
            );
            return Ok(app.shell().command(path.to_string_lossy().as_ref()));
        }
    }
    app.shell().sidecar("yt-dlp").map_err(|e| {
        let msg = environment::sidecar_error_message(&e);
        logger::error("ytdlp", &msg);
        crate::AppError::DownloadError(msg)
    })
}

fn title_looks_private(title: &str, lower: &str) -> bool {
    lower.contains("private video")
        || lower.contains("[private]")
        || title.contains("비공개 동영상")
        || title.contains("[비공개")
}

fn title_looks_deleted(title: &str, lower: &str) -> bool {
    lower.contains("deleted video")
        || lower.contains("[deleted]")
        || title.contains("삭제된 동영상")
        || title.contains("[삭제")
}

fn classify_availability(availability: Option<&str>) -> Option<&'static str> {
    let a = availability.map(str::trim).filter(|s| !s.is_empty())?;
    let lower = a.to_lowercase();
    match lower.as_str() {
        "private" | "needs_auth" | "subscriber_only" => Some("private"),
        // Rare; treat as unavailable-other rather than downloadable.
        "premium_only" => Some("unknown"),
        _ => None,
    }
}

/// yt-dlp 덤프 엔트리 분류 (다운로드 가능 여부).
///
/// Title placeholders (EN/KO) first, then `availability`, then empty → unknown.
pub fn classify_entry(entry: &crate::models::YtDlpEntry) -> &'static str {
    if let Some(t) = entry.title.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        let lower = t.to_lowercase();
        if title_looks_private(t, &lower) {
            return "private";
        }
        if title_looks_deleted(t, &lower) {
            return "deleted";
        }
        // yt-dlp placeholder when metadata is missing
        if lower == "na" || lower == "n/a" {
            if let Some(reason) = classify_availability(entry.availability.as_deref()) {
                return reason;
            }
            return "unknown";
        }
        if let Some(reason) = classify_availability(entry.availability.as_deref()) {
            return reason;
        }
        return "available";
    }
    if let Some(reason) = classify_availability(entry.availability.as_deref()) {
        return reason;
    }
    "unknown"
}

/// 비공개/삭제/비활성화된 영상(제목이 없거나 [Private video] 등)은 제외합니다.
pub fn is_valid_entry(entry: &crate::models::YtDlpEntry) -> bool {
    classify_entry(entry) == "available"
}

/// Map a yt-dlp JSON dump into app playlist metadata (playlist or single video).
pub fn playlist_metadata_from_dump(
    dump: YtDlpDump,
    fallback_url: &str,
) -> crate::models::PlaylistMetadata {
    use crate::models::{PlaylistMetadata, SkippedTrack, TrackMetadata};

    let mut tracks = Vec::new();
    let mut skipped = Vec::new();
    let playlist_title = dump.title.unwrap_or_else(|| "Unknown".to_string());

    if dump._type.as_deref() == Some("playlist") {
        if let Some(entries) = dump.entries {
            for (idx, slot) in entries.into_iter().enumerate() {
                let index = idx + 1;
                let Some(entry) = slot else {
                    skipped.push(SkippedTrack {
                        index,
                        title: format!("Track {index}"),
                        reason: "unknown".into(),
                    });
                    continue;
                };
                let reason = classify_entry(&entry);
                let title = entry
                    .title
                    .clone()
                    .filter(|t| !t.trim().is_empty())
                    .unwrap_or_else(|| format!("Track {index}"));
                if reason == "available" {
                    let id = entry.id.unwrap_or_else(|| "".into());
                    let track_url = entry
                        .url
                        .unwrap_or_else(|| format!("https://www.youtube.com/watch?v={}", id));
                    tracks.push(TrackMetadata {
                        index,
                        title,
                        id,
                        url: track_url,
                    });
                } else {
                    skipped.push(SkippedTrack {
                        index,
                        title,
                        reason: reason.to_string(),
                    });
                }
            }
        }
    } else {
        tracks.push(TrackMetadata {
            index: 1,
            title: playlist_title.clone(),
            id: "".into(),
            url: fallback_url.to_string(),
        });
    }

    PlaylistMetadata {
        title: playlist_title,
        tracks,
        skipped,
    }
}

/// yt-dlp 사이드카를 통해 URL의 flat playlist 정보를 JSON 덤프로 조회합니다.
pub async fn fetch_playlist_dump(
    app: &tauri::AppHandle,
    url: &str,
) -> Result<YtDlpDump, crate::AppError> {
    logger::info(
        "ytdlp",
        &format!("플레이리스트 메타데이터 덤프 시작: {}", url),
    );
    let dump_args = vec![
        "--flat-playlist".into(),
        "--ignore-errors".into(),
        "-J".into(),
        url.to_string(),
    ];

    let dump_cmd = open_ytdlp(app)?.args(dump_args);

    let output = dump_cmd
        .output()
        .await
        .map_err(|e| crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {e}")))?;

    let json_str = String::from_utf8_lossy(&output.stdout);
    match serde_json::from_str::<YtDlpDump>(&json_str) {
        Ok(dump) => {
            let count = dump.entries.as_ref().map(|e| e.len()).unwrap_or(0);
            logger::info(
                "ytdlp",
                &format!("플레이리스트 덤프 완료: {} 개 항목 발견", count),
            );
            Ok(dump)
        }
        Err(e) => {
            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                logger::error("ytdlp", &format!("메타데이터 가져오기 실패: {}", err));
                return Err(crate::AppError::DownloadError(format!(
                    "메타데이터 가져오기 실패: {}",
                    err
                )));
            }
            logger::error("ytdlp", &format!("메타데이터 파싱 실패: {e}"));
            Err(crate::AppError::DownloadError(format!(
                "메타데이터 파싱 실패: {e}"
            )))
        }
    }
}

/// 개별 다운로드 작업에 필요한 yt-dlp 실행 인자를 구성합니다.
pub fn build_ytdlp_args(
    task: &DownloadTask,
    actual_download_dir: &str,
    audio_format: &str,
) -> Vec<String> {
    let format = if audio_format.eq_ignore_ascii_case("mp3") {
        "mp3"
    } else {
        "m4a"
    };

    let mut yt_dlp_args: Vec<String> = vec![
        "--no-playlist".into(),
        "--ignore-errors".into(),
        "--no-colors".into(),
        "-x".into(),
        "--audio-format".into(),
        format.into(),
        "--audio-quality".into(),
        "0".into(),
        "--embed-thumbnail".into(),
        "--convert-thumbnails".into(),
        "jpg".into(),
        "--embed-metadata".into(),
        "--newline".into(),
    ];

    if !actual_download_dir.is_empty() {
        yt_dlp_args.push("-P".into());
        yt_dlp_args.push(actual_download_dir.to_string());
    }

    if let Some(deno_path) = environment::get_deno_path() {
        yt_dlp_args.push("--js-runtimes".into());
        yt_dlp_args.push(format!("deno:{}", deno_path.display()));
    }

    if let Some(ffmpeg_dir) = environment::get_ffmpeg_location() {
        yt_dlp_args.push("--ffmpeg-location".into());
        yt_dlp_args.push(ffmpeg_dir.to_string());
    }

    yt_dlp_args.push(task.url.clone());
    yt_dlp_args
}

/// yt-dlp 자식 프로세스에서 발생하는 stdout/stderr 이벤트를 구독하여 진행률을 파싱하고 방출합니다.
pub async fn handle_command_events(
    app: tauri::AppHandle,
    mut rx: tauri::async_runtime::Receiver<CommandEvent>,
    task: &DownloadTask,
    playlist_title: Option<String>,
    regexes: Arc<DownloadRegexes>,
) -> Result<(), crate::AppError> {
    let mut exit_success = true;
    let mut exit_code: Option<i32> = None;

    let mut parse = ProgressParseState {
        item_title: task.title.clone(),
        track_status: Some("downloading".to_string()),
        track_progress: Some(0.0),
        speed: None,
        eta: None,
        playlist_title: playlist_title.clone(),
    };

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
                if !line.is_empty() {
                    apply_ytdlp_stdout_line(&line, &regexes, &mut parse);

                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: line.clone(),
                            message: line,
                            is_error: false,
                            playlist_title: parse.playlist_title.clone(),
                            item_index: Some(task.item_index),
                            total_items: Some(task.total_items),
                            item_title: parse
                                .item_title
                                .clone()
                                .or_else(|| task.title.clone()),
                            track_progress: parse.track_progress,
                            track_status: parse.track_status.clone(),
                            speed: parse.speed.clone(),
                            eta: parse.eta.clone(),
                            error_message: None,
                        },
                    );
                }
            }
            CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
                if !line.is_empty() {
                    let mut err_msg = None;
                    if let Some(caps) = regexes.re_error.captures(&line) {
                        let msg = caps[1].trim().to_string();
                        logger::error(
                            "ytdlp",
                            &format!("[트랙 #{}] yt-dlp ERROR: {}", task.item_index, msg),
                        );
                        err_msg = Some(msg);
                    } else if line.contains("WARNING:") {
                        logger::warn("ytdlp", &format!("[트랙 #{}] {}", task.item_index, line));
                    }

                    // Only mark failed on ERROR lines — yt-dlp writes progress noise to stderr too.
                    let track_status = if err_msg.is_some() {
                        Some("failed".to_string())
                    } else {
                        parse.track_status.clone()
                    };

                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: line.clone(),
                            message: line,
                            is_error: err_msg.is_some(),
                            playlist_title: parse.playlist_title.clone(),
                            item_index: Some(task.item_index),
                            total_items: Some(task.total_items),
                            item_title: parse
                                .item_title
                                .clone()
                                .or_else(|| task.title.clone()),
                            track_progress: parse.track_progress,
                            track_status,
                            speed: parse.speed.clone(),
                            eta: parse.eta.clone(),
                            error_message: err_msg,
                        },
                    );
                }
            }
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
                if payload.code != Some(0) {
                    exit_success = false;
                    logger::warn(
                        "ytdlp",
                        &format!(
                            "[트랙 #{}] 프로세스 비정상 종료 (코드: {:?})",
                            task.item_index, payload.code
                        ),
                    );
                    let err_msg = format!(
                        "다운로드 실패 (종료 코드: {:?})",
                        payload.code.unwrap_or(-1)
                    );
                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: err_msg.clone(),
                            message: err_msg.clone(),
                            is_error: true,
                            playlist_title: parse.playlist_title.clone(),
                            item_index: Some(task.item_index),
                            total_items: Some(task.total_items),
                            item_title: parse
                                .item_title
                                .clone()
                                .or_else(|| task.title.clone()),
                            track_progress: parse.track_progress,
                            track_status: Some("failed".to_string()),
                            speed: None,
                            eta: None,
                            error_message: Some(err_msg),
                        },
                    );
                }
            }
            CommandEvent::Error(err) => {
                logger::error(
                    "ytdlp",
                    &format!("[트랙 #{}] 실행 오류: {}", task.item_index, err),
                );
                let err_msg = format!("실행 오류: {err}");
                let _ = app.emit(
                    "download-progress",
                    ProgressPayload {
                        line: err_msg.clone(),
                        message: err_msg.clone(),
                        is_error: true,
                        playlist_title: parse.playlist_title.clone(),
                        item_index: Some(task.item_index),
                        total_items: Some(task.total_items),
                        item_title: parse.item_title.clone().or_else(|| task.title.clone()),
                        track_progress: parse.track_progress,
                        track_status: Some("failed".to_string()),
                        speed: None,
                        eta: None,
                        error_message: Some(err_msg.clone()),
                    },
                );
                exit_success = false;
            }
            _ => {}
        }
    }

    if exit_success {
        Ok(())
    } else {
        Err(crate::AppError::DownloadError(format!(
            "다운로드 실패 (종료 코드: {:?})",
            exit_code.unwrap_or(-1)
        )))
    }
}

/// 개별 트랙 다운로드를 위해 사이드카를 spawn하고 PID 등록/해제 및 이벤트를 처리합니다.
pub async fn process_item(
    app: tauri::AppHandle,
    task: DownloadTask,
    actual_download_dir: String,
    playlist_title: Option<String>,
    regexes: Arc<DownloadRegexes>,
    audio_format: &str,
) -> Result<(), crate::AppError> {
    logger::info(
        "download",
        &format!(
            "[{}/{}] 다운로드 시작: {}",
            task.item_index, task.total_items, task.url
        ),
    );
    let yt_dlp_args = build_ytdlp_args(&task, &actual_download_dir, audio_format);

    let command = open_ytdlp(&app)?.args(yt_dlp_args);

    let (rx, child) = command.spawn().map_err(|e| {
        let msg = environment::sidecar_error_message(&e);
        logger::error("download", &format!("[트랙 #{}] {msg}", task.item_index));
        crate::AppError::DownloadError(msg)
    })?;

    let pid = child.pid();
    let state = app.state::<AppState>();
    state.register_pid(pid);

    let result = handle_command_events(app.clone(), rx, &task, playlist_title, regexes).await;

    state.unregister_pid(pid);

    match &result {
        Ok(_) => logger::info(
            "download",
            &format!("[트랙 #{}] 다운로드 완료", task.item_index),
        ),
        Err(e) => logger::error(
            "download",
            &format!("[트랙 #{}] 다운로드 실패: {}", task.item_index, e),
        ),
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::YtDlpEntry;

    fn entry(title: Option<&str>) -> YtDlpEntry {
        entry_with(title, None)
    }

    fn entry_with(title: Option<&str>, availability: Option<&str>) -> YtDlpEntry {
        YtDlpEntry {
            url: Some("https://www.youtube.com/watch?v=dQw4w9WgXcQ".into()),
            id: Some("dQw4w9WgXcQ".into()),
            title: title.map(|t| t.to_string()),
            availability: availability.map(|a| a.to_string()),
        }
    }

    #[test]
    fn build_args_default_m4a() {
        let task = DownloadTask {
            url: "https://example.com/v".into(),
            item_index: 1,
            total_items: 1,
            title: None,
        };
        let args = build_ytdlp_args(&task, "/tmp", "m4a");
        assert!(args
            .windows(2)
            .any(|w| w[0] == "--audio-format" && w[1] == "m4a"));
    }

    #[test]
    fn build_args_omits_subtitles_by_default() {
        let task = DownloadTask {
            url: "https://example.com/v".into(),
            item_index: 1,
            total_items: 1,
            title: None,
        };
        let args = build_ytdlp_args(&task, "/tmp", "m4a");
        assert!(
            !args.iter().any(|a| a == "--write-subs"
                || a == "--embed-subs"
                || a == "--sub-langs"
                || a == "all,-live_chat"),
            "audio downloads should not pull subtitles by default: {args:?}"
        );
    }

    #[test]
    fn build_args_mp3() {
        let task = DownloadTask {
            url: "https://example.com/v".into(),
            item_index: 1,
            total_items: 1,
            title: Some("Song".into()),
        };
        let args = build_ytdlp_args(&task, "", "mp3");
        assert!(args
            .windows(2)
            .any(|w| w[0] == "--audio-format" && w[1] == "mp3"));
    }

    #[test]
    fn accepts_normal_titles() {
        assert!(is_valid_entry(&entry(Some("My Cool Track"))));
    }

    #[test]
    fn rejects_missing_or_empty_title() {
        assert!(!is_valid_entry(&entry(None)));
        assert!(!is_valid_entry(&entry(Some(""))));
        assert!(!is_valid_entry(&entry(Some("   "))));
    }

    #[test]
    fn classify_private_deleted_unknown() {
        assert_eq!(classify_entry(&entry(Some("[Private video]"))), "private");
        assert_eq!(classify_entry(&entry(Some("[Deleted video]"))), "deleted");
        assert_eq!(classify_entry(&entry(None)), "unknown");
        assert_eq!(classify_entry(&entry(Some("  "))), "unknown");
        assert_eq!(classify_entry(&entry(Some("Normal"))), "available");
    }

    #[test]
    fn classify_uses_availability_when_title_empty() {
        assert_eq!(
            classify_entry(&entry_with(None, Some("private"))),
            "private"
        );
        assert_eq!(
            classify_entry(&entry_with(Some(""), Some("needs_auth"))),
            "private"
        );
        assert_eq!(
            classify_entry(&entry_with(None, Some("subscriber_only"))),
            "private"
        );
    }

    #[test]
    fn classify_korean_and_unbracketed_titles() {
        assert_eq!(
            classify_entry(&entry(Some("비공개 동영상"))),
            "private"
        );
        assert_eq!(
            classify_entry(&entry(Some("[비공개 동영상]"))),
            "private"
        );
        assert_eq!(
            classify_entry(&entry(Some("삭제된 동영상"))),
            "deleted"
        );
        assert_eq!(
            classify_entry(&entry(Some("Private video"))),
            "private"
        );
        assert_eq!(
            classify_entry(&entry(Some("Deleted video"))),
            "deleted"
        );
    }

    #[test]
    fn playlist_dump_keeps_skipped_with_original_index() {
        let dump = YtDlpDump {
            _type: Some("playlist".into()),
            title: Some("PL".into()),
            entries: Some(vec![
                Some(entry(Some("A"))),
                Some(entry(Some("[Private video]"))),
                Some(entry(Some("B"))),
                Some(entry(Some("[Deleted video]"))),
            ]),
        };
        let meta = playlist_metadata_from_dump(dump, "https://example.com");
        assert_eq!(meta.tracks.len(), 2);
        assert_eq!(meta.tracks[0].index, 1);
        assert_eq!(meta.tracks[1].index, 3);
        assert_eq!(meta.skipped.len(), 2);
        assert_eq!(meta.skipped[0].index, 2);
        assert_eq!(meta.skipped[0].reason, "private");
        assert_eq!(meta.skipped[1].index, 4);
        assert_eq!(meta.skipped[1].reason, "deleted");
    }

    #[test]
    fn playlist_dump_null_slot_and_availability() {
        let dump = YtDlpDump {
            _type: Some("playlist".into()),
            title: Some("PL".into()),
            entries: Some(vec![
                Some(entry(Some("Ok"))),
                None,
                Some(entry_with(None, Some("private"))),
            ]),
        };
        let meta = playlist_metadata_from_dump(dump, "https://example.com");
        assert_eq!(meta.tracks.len(), 1);
        assert_eq!(meta.skipped.len(), 2);
        assert_eq!(meta.skipped[0].reason, "unknown");
        assert_eq!(meta.skipped[1].reason, "private");
    }

    #[test]
    fn deserializes_flat_entry_with_availability() {
        let raw = r#"{"id":"abc","title":null,"availability":"private"}"#;
        let entry: YtDlpEntry = serde_json::from_str(raw).expect("entry");
        assert_eq!(classify_entry(&entry), "private");
    }
}
