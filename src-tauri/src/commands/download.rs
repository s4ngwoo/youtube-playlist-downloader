
use std::sync::Arc;
use futures::stream::{self, StreamExt};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::models::ProgressPayload;
use crate::parser::{clean_title_from_destination, DownloadRegexes};
use crate::process::AppState;
use crate::commands::utils::get_default_download_dir;

#[derive(serde::Deserialize, Debug)]
struct YtDlpDump {
    #[serde(rename = "_type")]
    _type: Option<String>,
    title: Option<String>,
    entries: Option<Vec<YtDlpEntry>>,
}

#[derive(serde::Deserialize, Debug)]
struct YtDlpEntry {
    url: Option<String>,
    id: Option<String>,
    title: Option<String>,
}

#[derive(Clone)]
struct DownloadTask {
    url: String,
    item_index: usize,
    total_items: usize,
}

#[derive(serde::Serialize)]
pub struct TrackMetadata {
    pub index: usize,
    pub title: String,
    pub id: String,
    pub url: String,
}

#[derive(serde::Serialize)]
pub struct PlaylistMetadata {
    pub title: String,
    pub tracks: Vec<TrackMetadata>,
}

#[tauri::command]
pub async fn fetch_metadata(app: tauri::AppHandle, url: String) -> Result<PlaylistMetadata, crate::AppError> {
    if url.trim().is_empty() {
        return Err(crate::AppError::DownloadError("URL을 입력해 주세요.".into()));
    }

    let dump_args = vec![
        "--flat-playlist".into(),
        "-J".into(),
        url.clone(),
    ];
    let dump_cmd = app.shell().sidecar("yt-dlp")
        .map_err(|e| crate::AppError::DownloadError(format!("yt-dlp 사이드카 생성 실패: {e}")))?
        .args(dump_args);
        
    let output = dump_cmd.output().await.map_err(|e| crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {e}")))?;
    
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {}", err)));
    }
    
    let json_str = String::from_utf8_lossy(&output.stdout);
    let dump: YtDlpDump = serde_json::from_str(&json_str).map_err(|e| crate::AppError::DownloadError(format!("메타데이터 파싱 실패: {e}")))?;
    
    let mut tracks = Vec::new();
    let playlist_title = dump.title.unwrap_or_else(|| "Unknown".to_string());
    
    if dump._type.as_deref() == Some("playlist") {
        if let Some(entries) = dump.entries {
            for (idx, entry) in entries.into_iter().enumerate() {
                let id = entry.id.unwrap_or_else(|| "".into());
                let track_url = entry.url.unwrap_or_else(|| format!("https://www.youtube.com/watch?v={}", id));
                tracks.push(TrackMetadata {
                    index: idx + 1,
                    title: entry.title.unwrap_or_else(|| format!("Track {}", idx + 1)),
                    id,
                    url: track_url,
                });
            }
        }
    } else {
        // 단일 비디오
        tracks.push(TrackMetadata {
            index: 1,
            title: playlist_title.clone(),
            id: "".into(),
            url: url.clone(),
        });
    }

    Ok(PlaylistMetadata {
        title: playlist_title,
        tracks,
    })
}



/// 프론트엔드에서 사용자가 다운로드를 즉시 취소할 수 있는 Command
#[tauri::command]
pub fn cancel_download(state: tauri::State<'_, AppState>) -> Result<String, crate::AppError> {
    state.kill_all();
    Ok("진행 중인 모든 다운로드 작업이 중단되었습니다.".into())
}

/// 비동기 오디오(m4a) 병렬 다운로드 Command
#[tauri::command]
pub async fn download_audio(
    app: tauri::AppHandle,
    _state: tauri::State<'_, AppState>,
    url: String,
    download_dir: Option<String>,
    playlist_items: Option<String>,
) -> Result<String, crate::AppError> {
    if url.trim().is_empty() {
        return Err(crate::AppError::DownloadError("다운로드할 URL을 입력해 주세요.".into()));
    }

    let actual_download_dir = if let Some(dir) = download_dir.as_ref() {
        if !dir.trim().is_empty() {
            dir.clone()
        } else {
            get_default_download_dir(app.clone()).unwrap_or_else(|_| "".into())
        }
    } else {
        get_default_download_dir(app.clone()).unwrap_or_else(|_| "".into())
    };

    // Phase 1: 메타데이터 가져오기
    let dump_args = vec![
        "--flat-playlist".into(),
        "-J".into(),
        url.clone(),
    ];
    let dump_cmd = app.shell().sidecar("yt-dlp")
        .map_err(|e| crate::AppError::DownloadError(format!("yt-dlp 사이드카 생성 실패: {e}")))?
        .args(dump_args);
        
    let output = dump_cmd.output().await.map_err(|e| crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {e}")))?;
    
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(crate::AppError::DownloadError(format!("메타데이터 가져오기 실패: {}", err)));
    }
    
    let json_str = String::from_utf8_lossy(&output.stdout);
    let dump: YtDlpDump = serde_json::from_str(&json_str).map_err(|e| crate::AppError::DownloadError(format!("메타데이터 파싱 실패: {e}")))?;
    
    let mut tasks = Vec::new();
    let playlist_title = dump.title;
    
    if dump._type.as_deref() == Some("playlist") {
        if let Some(entries) = dump.entries {
            let total = entries.len();
            
            let items_to_download: Vec<usize> = if let Some(items) = &playlist_items {
                if items.trim().is_empty() {
                    (1..=total).collect()
                } else {
                    items.split(',').filter_map(|s| s.trim().parse::<usize>().ok()).collect()
                }
            } else {
                (1..=total).collect()
            };
            
            for (idx, entry) in entries.into_iter().enumerate() {
                let item_index = idx + 1;
                if items_to_download.contains(&item_index) {
                    if let Some(entry_url) = entry.url {
                        tasks.push(DownloadTask {
                            url: entry_url,
                            item_index,
                            total_items: total,
                        });
                    } else if let Some(id) = entry.id {
                        tasks.push(DownloadTask {
                            url: format!("https://www.youtube.com/watch?v={}", id),
                            item_index,
                            total_items: total,
                        });
                    }
                }
            }
        }
    } else {
        // 단일 비디오
        tasks.push(DownloadTask {
            url: url.clone(),
            item_index: 1,
            total_items: 1,
        });
    }

    if tasks.is_empty() {
        return Err(crate::AppError::DownloadError("다운로드할 항목이 없습니다.".into()));
    }

    // Phase 2: 병렬 다운로드 (동시성 제한 3)
    let concurrency = 3;
    let regexes = Arc::new(DownloadRegexes::new());
    
    let stream = stream::iter(tasks).map(|task| {
        let app = app.clone();
        let actual_download_dir = actual_download_dir.clone();
        let playlist_title = playlist_title.clone();
        let regexes = Arc::clone(&regexes);
        
        async move {
            process_item(
                app,
                task,
                actual_download_dir,
                playlist_title,
                regexes
            ).await
        }
    });

    let results: Vec<Result<(), String>> = stream.buffer_unordered(concurrency).collect().await;
    
    let mut has_error = false;
    for res in results {
        if res.is_err() {
            has_error = true;
        }
    }

    if !actual_download_dir.is_empty() {
        let _ = crate::nfc::normalize_directory_nfc(std::path::Path::new(&actual_download_dir));
    }
    
    if has_error {
        Err(crate::AppError::DownloadError("일부 항목 다운로드 중 오류가 발생했습니다.".into()))
    } else {
        Ok("플레이리스트 및 오디오 다운로드가 완료되었습니다.".into())
    }
}

async fn process_item(
    app: tauri::AppHandle,
    task: DownloadTask,
    actual_download_dir: String,
    playlist_title: Option<String>,
    regexes: Arc<DownloadRegexes>,
) -> Result<(), String> {
    let mut yt_dlp_args: Vec<String> = vec![
        "--no-playlist".into(),
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
        yt_dlp_args.push(actual_download_dir);
    }

    let mut candidate_deno_paths = vec![
        std::path::PathBuf::from("/opt/homebrew/bin/deno"),
        std::path::PathBuf::from("/usr/local/bin/deno"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        candidate_deno_paths.push(std::path::PathBuf::from(home).join(".deno/bin/deno"));
    }
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        candidate_deno_paths.push(std::path::PathBuf::from(userprofile).join(".deno/bin/deno.exe"));
    }

    for path in candidate_deno_paths {
        if path.exists() {
            yt_dlp_args.push("--js-runtimes".into());
            yt_dlp_args.push(format!("deno:{}", path.display()));
            break;
        }
    }

    for path in ["/opt/homebrew/bin", "/usr/local/bin"] {
        if std::path::Path::new(path).join("ffmpeg").exists() {
            yt_dlp_args.push("--ffmpeg-location".into());
            yt_dlp_args.push(path.into());
            break;
        }
    }

    yt_dlp_args.push(task.url.clone());

    let command = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("yt-dlp 사이드카 생성 실패: {e}"))?
        .args(yt_dlp_args);

    let (mut rx, child) = command
        .spawn()
        .map_err(|e| format!("yt-dlp 프로세스 실행 실패: {e}"))?;

    let pid = child.pid();
    let state = app.state::<AppState>();
    state.register_pid(pid);

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
                        err_msg = Some(caps[1].trim().to_string());
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
                }
            }
            CommandEvent::Error(err) => {
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

    state.unregister_pid(pid);

    if exit_success {
        Ok(())
    } else {
        Err(format!("다운로드 실패 (종료 코드: {:?})", exit_code.unwrap_or(-1)))
    }
}
