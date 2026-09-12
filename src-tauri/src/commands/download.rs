use futures::stream::{self, StreamExt};
use std::sync::Arc;

use crate::commands::utils::get_default_download_dir;
use crate::models::{DownloadTask, PlaylistMetadata};
use crate::parser::DownloadRegexes;
use crate::process::AppState;
use crate::services::environment;
use crate::services::logger;
use crate::services::ytdlp::{
    enrich_skipped_with_probe_targets, fetch_playlist_dump, playlist_metadata_from_dump,
    probe_targets_from_dump, process_item,
};

/// 플레이리스트 또는 단일 영상의 메타데이터(제목 및 트랙 목록)를 가져오는 Command
#[tauri::command]
pub async fn fetch_metadata(
    app: tauri::AppHandle,
    url: String,
) -> Result<PlaylistMetadata, crate::AppError> {
    if url.trim().is_empty() {
        return Err(crate::AppError::DownloadError("error.empty_url".into()));
    }

    let dump = fetch_playlist_dump(&app, &url).await?;
    let targets = probe_targets_from_dump(&dump);
    let mut meta = playlist_metadata_from_dump(dump, &url);
    enrich_skipped_with_probe_targets(&app, targets, &mut meta).await;
    Ok(meta)
}

/// 프론트엔드에서 사용자가 다운로드를 즉시 취소할 수 있는 Command
#[tauri::command]
pub fn cancel_download(state: tauri::State<'_, AppState>) -> Result<String, crate::AppError> {
    logger::info("download", "사용자가 다운로드 취소를 요청했습니다.");
    state.kill_all();
    Ok("ok.cancelled".into())
}

/// 선택된 트랙 목록의 직접 다운로드 구조체 (프론트엔드에서 전달)
#[derive(serde::Deserialize, Debug)]
pub struct SelectedTrack {
    pub url: String,
    pub index: usize,
    #[serde(default)]
    pub title: Option<String>,
}

/// 비동기 오디오 병렬 다운로드 Command
#[tauri::command]
pub async fn download_audio(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    download_dir: Option<String>,
    playlist_title: Option<String>,
    selected_tracks: Vec<SelectedTrack>,
    concurrency: Option<usize>,
    audio_format: Option<String>,
) -> Result<String, crate::AppError> {
    if selected_tracks.is_empty() {
        return Err(crate::AppError::DownloadError("error.no_items".into()));
    }

    let job_id = state.begin_job();

    environment::ensure_ffmpeg_available()?;
    environment::warn_if_deno_missing();

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
    let format = normalize_audio_format(audio_format.as_deref());
    let concurrency = concurrency.unwrap_or(3).clamp(1, 8);

    logger::info(
        "download",
        &format!(
            "다운로드 시작 — 총 {}개 트랙, 동시성 {}, 포맷 {}, 저장 경로: {}",
            total, concurrency, format, actual_download_dir
        ),
    );

    let tasks: Vec<DownloadTask> = selected_tracks
        .into_iter()
        .map(|st| DownloadTask {
            url: st.url,
            item_index: st.index,
            total_items: total,
            title: st.title.filter(|t| !t.trim().is_empty()),
        })
        .collect();

    let regexes = Arc::new(DownloadRegexes::new());
    let format_arc = Arc::new(format);
    let cancel_state = (*state).clone();

    let stream = stream::iter(tasks).map(|task| {
        let app = app.clone();
        let actual_download_dir = actual_download_dir.clone();
        let playlist_title = playlist_title.clone();
        let regexes = Arc::clone(&regexes);
        let format = Arc::clone(&format_arc);
        let cancel_state = cancel_state.clone();

        async move {
            if !cancel_state.is_current_job(job_id) {
                return Err(crate::AppError::DownloadError("cancelled".into()));
            }
            process_item(
                app,
                task,
                actual_download_dir,
                playlist_title,
                regexes,
                format.as_str(),
                job_id,
            )
            .await
        }
    });

    let results: Vec<Result<(), crate::AppError>> =
        stream.buffer_unordered(concurrency).collect().await;

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

    if !cancel_state.is_current_job(job_id) {
        logger::info(
            "download",
            &format!(
                "다운로드 취소됨 — 성공: {}개, 실패/중단: {}개",
                success_count, fail_count
            ),
        );
        return Ok("ok.cancelled".into());
    }

    logger::info(
        "download",
        &format!(
            "다운로드 완료 — 성공: {}개, 실패: {}개",
            success_count, fail_count
        ),
    );

    if success_count == 0 && fail_count > 0 {
        Err(crate::AppError::DownloadError("error.all_failed".into()))
    } else if fail_count > 0 {
        Ok(format!("ok.download_partial:{success_count}:{fail_count}"))
    } else {
        Ok("ok.download_complete".into())
    }
}

fn normalize_audio_format(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_ascii_lowercase()).as_deref() {
        Some("mp3") => "mp3".into(),
        _ => "m4a".into(),
    }
}
