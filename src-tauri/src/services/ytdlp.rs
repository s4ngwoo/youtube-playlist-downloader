use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::models::{DownloadTask, ProgressPayload, YtDlpDump};
use crate::parser::{clean_title_from_destination, DownloadRegexes};
use crate::process::AppState;
use crate::services::{environment, logger};

/// yt-dlp 덤프 엔트리가 유효하고 다운로드 가능한 정상 영상인지 검증합니다.
/// 비공개/삭제/비활성화된 영상(제목이 없거나 [Private video] 등)은 제외합니다.
pub fn is_valid_entry(entry: &crate::models::YtDlpEntry) -> bool {
    if let Some(title) = &entry.title {
        let t = title.trim();
        if t.is_empty()
            || t == "[Private video]"
            || t == "[Deleted video]"
            || t.to_lowercase().contains("private video")
            || t.to_lowercase().contains("deleted video")
        {
            return false;
        }
        true
    } else {
        false
    }
}

/// yt-dlp 사이드카를 통해 URL의 flat playlist 정보를 JSON 덤프로 조회합니다.
pub async fn fetch_playlist_dump(app: &tauri::AppHandle, url: &str) -> Result<YtDlpDump, crate::AppError> {
    logger::info("ytdlp", &format!("플레이리스트 메타데이터 덤프 시작: {}", url));
    let dump_args = vec![
        "--flat-playlist".into(),
        "--ignore-errors".into(),
        "-J".into(),
        url.to_string(),
    ];

    let dump_cmd = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| {
            logger::error("ytdlp", &format!("yt-dlp 사이드카 생성 실패: {e}"));
            crate::AppError::DownloadError(format!("yt-dlp 사이드카 생성 실패: {e}"))
        })?
        .args(dump_args);

    let output = dump_cmd
        .output()
        .await
        .map_err(|e| crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {e}")))?;

    let json_str = String::from_utf8_lossy(&output.stdout);
    match serde_json::from_str::<YtDlpDump>(&json_str) {
        Ok(dump) => {
            let count = dump.entries.as_ref().map(|e| e.len()).unwrap_or(0);
            logger::info("ytdlp", &format!("플레이리스트 덤프 완료: {} 개 항목 발견", count));
            Ok(dump)
        }
        Err(e) => {
            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                logger::error("ytdlp", &format!("메타데이터 가져오기 실패: {}", err));
                return Err(crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {}", err)));
            }
            logger::error("ytdlp", &format!("메타데이터 파싱 실패: {e}"));
            Err(crate::AppError::DownloadError(format!("메타데이터 파싱 실패: {e}")))
        }
    }
}

/// 개별 다운로드 작업에 필요한 yt-dlp 실행 인자를 구성합니다.
pub fn build_ytdlp_args(task: &DownloadTask, actual_download_dir: &str) -> Vec<String> {
    let mut yt_dlp_args: Vec<String> = vec![
        "--no-playlist".into(),
        "--ignore-errors".into(),
        "--no-colors".into(),
        "-x".into(),
        "--audio-format".into(),
        "m4a".into(),
        "--audio-quality".into(),
        "0".into(),
        "--embed-thumbnail".into(),
        "--convert-thumbnails".into(),
        "jpg".into(),
        "--embed-metadata".into(),
        "--write-subs".into(),
        "--embed-subs".into(),
        "--sub-langs".into(),
        "all,-live_chat".into(),
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
) -> Result<(), String> {
    let mut exit_success = true;
    let mut exit_code: Option<i32> = None;

    let mut current_item_title: Option<String> = None;
    let mut current_track_status: Option<String> = Some("downloading".to_string());
    let mut current_track_progress: Option<f32> = Some(0.0);
    let mut current_speed: Option<String> = None;
    let mut current_eta: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
                if !line.is_empty() {
                    if let Some(caps) = regexes.re_dest.captures(&line) {
                        let cleaned = clean_title_from_destination(&caps[1]);
                        current_item_title = Some(cleaned);
                    }

                    if let Some(caps) = regexes.re_already.captures(&line) {
                        let cleaned = clean_title_from_destination(&caps[1]);
                        current_item_title = Some(cleaned);
                        current_track_status = Some("completed".to_string());
                        current_track_progress = Some(100.0);
                    }

                    if line.contains("[ExtractAudio]") {
                        current_track_status = Some("extracting".to_string());
                        current_track_progress = Some(92.0);
                    } else if line.contains("[ThumbnailsConvertor]") {
                        current_track_status = Some("converting_art".to_string());
                        current_track_progress = Some(95.0);
                    } else if line.contains("[EmbedThumbnail]") || line.contains("[Metadata]") {
                        current_track_status = Some("tagging".to_string());
                        current_track_progress = Some(98.0);
                    }

                    if let Some(caps) = regexes.re_progress.captures(&line) {
                        if let Ok(p) = caps[1].parse::<f32>() {
                            current_track_progress = Some(p);
                            if p >= 100.0 {
                                current_track_status = Some("downloaded".to_string());
                            } else {
                                current_track_status = Some("downloading".to_string());
                            }
                        }
                    }

                    if line.contains("Deleting original file") {
                        current_track_status = Some("completed".to_string());
                        current_track_progress = Some(100.0);
                    }

                    if let Some(caps) = regexes.re_speed.captures(&line) {
                        current_speed = Some(caps[1].to_string());
                    }
                    if let Some(caps) = regexes.re_eta.captures(&line) {
                        current_eta = Some(caps[1].to_string());
                    }

                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: line.clone(),
                            message: line,
                            is_error: false,
                            playlist_title: playlist_title.clone(),
                            item_index: Some(task.item_index),
                            total_items: Some(task.total_items),
                            item_title: current_item_title.clone(),
                            track_progress: current_track_progress,
                            track_status: current_track_status.clone(),
                            speed: current_speed.clone(),
                            eta: current_eta.clone(),
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
                        logger::error("ytdlp", &format!("[트랙 #{}] yt-dlp ERROR: {}", task.item_index, msg));
                        err_msg = Some(msg);
                    } else if line.contains("WARNING:") {
                        logger::warn("ytdlp", &format!("[트랙 #{}] {}", task.item_index, line));
                    }

                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: line.clone(),
                            message: line,
                            is_error: true,
                            playlist_title: playlist_title.clone(),
                            item_index: Some(task.item_index),
                            total_items: Some(task.total_items),
                            item_title: current_item_title.clone(),
                            track_progress: current_track_progress,
                            track_status: Some("failed".to_string()),
                            speed: current_speed.clone(),
                            eta: current_eta.clone(),
                            error_message: err_msg,
                        },
                    );
                }
            }
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
                if payload.code != Some(0) {
                    exit_success = false;
                    logger::warn("ytdlp", &format!("[트랙 #{}] 프로세스 비정상 종료 (코드: {:?})", task.item_index, payload.code));
                }
            }
            CommandEvent::Error(err) => {
                logger::error("ytdlp", &format!("[트랙 #{}] 실행 오류: {}", task.item_index, err));
                let err_msg = format!("실행 오류: {err}");
                let _ = app.emit(
                    "download-progress",
                    ProgressPayload {
                        line: err_msg.clone(),
                        message: err_msg.clone(),
                        is_error: true,
                        playlist_title: playlist_title.clone(),
                        item_index: Some(task.item_index),
                        total_items: Some(task.total_items),
                        item_title: current_item_title.clone(),
                        track_progress: current_track_progress,
                        track_status: Some("failed".to_string()),
                        speed: current_speed.clone(),
                        eta: current_eta.clone(),
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
        Err(format!("다운로드 실패 (종료 코드: {:?})", exit_code.unwrap_or(-1)))
    }
}

/// 개별 트랙 다운로드를 위해 사이드카를 spawn하고 PID 등록/해제 및 이벤트를 처리합니다.
pub async fn process_item(
    app: tauri::AppHandle,
    task: DownloadTask,
    actual_download_dir: String,
    playlist_title: Option<String>,
    regexes: Arc<DownloadRegexes>,
) -> Result<(), String> {
    logger::info("download", &format!("[{}/{}] 다운로드 시작: {}", task.item_index, task.total_items, task.url));
    let yt_dlp_args = build_ytdlp_args(&task, &actual_download_dir);

    let command = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| {
            logger::error("download", &format!("[트랙 #{}] 사이드카 생성 실패: {}", task.item_index, e));
            format!("yt-dlp 사이드카 생성 실패: {e}")
        })?
        .args(yt_dlp_args);

    let (rx, child) = command
        .spawn()
        .map_err(|e| {
            logger::error("download", &format!("[트랙 #{}] 프로세스 실행 실패: {}", task.item_index, e));
            format!("yt-dlp 프로세스 실행 실패: {e}")
        })?;

    let pid = child.pid();
    let state = app.state::<AppState>();
    state.register_pid(pid);

    let result = handle_command_events(app.clone(), rx, &task, playlist_title, regexes).await;

    state.unregister_pid(pid);

    match &result {
        Ok(_) => logger::info("download", &format!("[트랙 #{}] 다운로드 완료", task.item_index)),
        Err(e) => logger::error("download", &format!("[트랙 #{}] 다운로드 실패: {}", task.item_index, e)),
    }

    result
}
