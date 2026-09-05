use std::sync::Arc;
use futures::stream::{self, StreamExt};

use crate::commands::utils::get_default_download_dir;
use crate::models::{DownloadTask, PlaylistMetadata, TrackMetadata};
use crate::parser::DownloadRegexes;
use crate::process::AppState;
use crate::services::ytdlp::{fetch_playlist_dump, is_valid_entry, process_item};
use crate::services::logger;

/// 플레이리스트 또는 단일 영상의 메타데이터(제목 및 트랙 목록)를 가져오는 Command
#[tauri::command]
pub async fn fetch_metadata(app: tauri::AppHandle, url: String) -> Result<PlaylistMetadata, crate::AppError> {
    if url.trim().is_empty() {
        return Err(crate::AppError::DownloadError("URL을 입력해 주세요.".into()));
    }

    let dump = fetch_playlist_dump(&app, &url).await?;
    let mut tracks = Vec::new();
    let playlist_title = dump.title.unwrap_or_else(|| "Unknown".to_string());

    if dump._type.as_deref() == Some("playlist") {
        if let Some(entries) = dump.entries {
            let valid_entries: Vec<_> = entries.into_iter().filter(is_valid_entry).collect();
            for (idx, entry) in valid_entries.into_iter().enumerate() {
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
    logger::info("download", "사용자가 다운로드 취소를 요청했습니다.");
    state.kill_all();
    Ok("진행 중인 모든 다운로드 작업이 중단되었습니다.".into())
}

/// 선택된 트랙 목록의 직접 다운로드 구조체 (프론트엔드에서 전달)
#[derive(serde::Deserialize, Debug)]
pub struct SelectedTrack {
    pub url: String,
    pub index: usize,
}

/// 비동기 오디오(m4a) 병렬 다운로드 Command
/// 프론트엔드가 이미 fetch_metadata로 받은 트랙 URL 목록을 직접 전달하므로
/// 중복 메타데이터 덤프가 발생하지 않습니다.
#[tauri::command]
pub async fn download_audio(
    app: tauri::AppHandle,
    _state: tauri::State<'_, AppState>,
    download_dir: Option<String>,
    playlist_title: Option<String>,
    selected_tracks: Vec<SelectedTrack>,
) -> Result<String, crate::AppError> {
    if selected_tracks.is_empty() {
        return Err(crate::AppError::DownloadError("다운로드할 항목이 없습니다.".into()));
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

    let total = selected_tracks.len();
    logger::info("download", &format!(
        "다운로드 시작 — 총 {}개 트랙, 저장 경로: {}",
        total, actual_download_dir
    ));

    let tasks: Vec<DownloadTask> = selected_tracks
        .into_iter()
        .map(|st| DownloadTask {
            url: st.url,
            item_index: st.index,
            total_items: total,
        })
        .collect();

    // 병렬 다운로드 (동시성 제한 3)
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
                regexes,
            ).await
        }
    });

    let results: Vec<Result<(), String>> = stream.buffer_unordered(concurrency).collect().await;

    let mut fail_count = 0;
    let mut success_count = 0;
    for res in results {
        if res.is_err() {
            fail_count += 1;
        } else {
            success_count += 1;
        }
    }

    if !actual_download_dir.is_empty() {
        let _ = crate::nfc::normalize_directory_nfc(std::path::Path::new(&actual_download_dir));
    }

    logger::info("download", &format!(
        "다운로드 완료 — 성공: {}개, 실패: {}개", success_count, fail_count
    ));

    if success_count == 0 && fail_count > 0 {
        Err(crate::AppError::DownloadError("모든 항목 다운로드에 실패했습니다.".into()))
    } else if fail_count > 0 {
        Ok(format!(
            "다운로드 완료 (성공: {}개, 실패: {}개 - 실패한 트랙은 재시도 버튼으로 다시 받을 수 있습니다)",
            success_count, fail_count
        ))
    } else {
        Ok("플레이리스트 및 오디오 다운로드가 완료되었습니다.".into())
    }
}
