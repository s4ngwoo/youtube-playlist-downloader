use tauri::Emitter;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::models::ProgressPayload;
use crate::parser::{clean_title_from_destination, DownloadRegexes};
use crate::process::AppState;
use crate::commands::utils::get_default_download_dir;

/// 프론트엔드에서 사용자가 다운로드를 즉시 취소할 수 있는 Command
#[tauri::command]
pub fn cancel_download(state: tauri::State<'_, AppState>) -> Result<String, crate::AppError> {
    state.kill_all();
    Ok("진행 중인 모든 다운로드 작업이 중단되었습니다.".into())
}

/// 비동기 오디오(m4a) 다운로드 Command (플레이리스트 및 사용자 지정 다운로드 경로 지원)
#[tauri::command]
pub async fn download_audio(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    url: String,
    download_dir: Option<String>,
) -> Result<String, crate::AppError> {
    // 1. URL 유효성 검사
    if url.trim().is_empty() {
        return Err(crate::AppError::DownloadError("다운로드할 URL을 입력해 주세요.".into()));
    }

    // 2. yt-dlp 사이드카 커맨드 생성
    let mut yt_dlp_args: Vec<String> = vec![
        "--yes-playlist".into(),
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

    // 사용자가 GUI에서 설정한 다운로드 디렉토리 지정 (-P / --paths)
    let actual_download_dir = if let Some(dir) = download_dir.as_ref() {
        if !dir.trim().is_empty() {
            yt_dlp_args.push("-P".into());
            yt_dlp_args.push(dir.trim().into());
            dir.clone()
        } else {
            get_default_download_dir(app.clone()).unwrap_or_else(|_| "".into())
        }
    } else {
        get_default_download_dir(app.clone()).unwrap_or_else(|_| "".into())
    };

    // Deno JavaScript 런타임 경로 자동 탐지 및 지정 (YouTube EJS 경고 및 속도 저하 해결)
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

    // macOS GUI 환경에서 PATH 문제로 ffmpeg를 못 찾는 상황을 방지하기 위해 표준 설치 경로 자동 지정
    for path in ["/opt/homebrew/bin", "/usr/local/bin"] {
        if std::path::Path::new(path).join("ffmpeg").exists() {
            yt_dlp_args.push("--ffmpeg-location".into());
            yt_dlp_args.push(path.into());
            break;
        }
    }

    yt_dlp_args.push(url);

    let command = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| crate::AppError::DownloadError(format!("yt-dlp 사이드카 생성 실패: {e}")))?
        .args(yt_dlp_args);

    // 3. 자식 프로세스 실행 (spawn)
    let (mut rx, child) = command
        .spawn()
        .map_err(|e| crate::AppError::DownloadError(format!("yt-dlp 프로세스 실행 실패: {e}")))?;

    let pid = child.pid();
    // 프로세스 추적 목록에 등록 (앱 비정상/강제 종료 시 클린업 대상)
    state.register_pid(pid);

    let mut exit_success = true;
    let mut exit_code: Option<i32> = None;

    // 4. stdout 라인 파싱용 정규식 패턴 준비
    let regexes = DownloadRegexes::new();

    // 플레이리스트 및 현재 트랙 추적 상태 변수
    let mut current_playlist_title: Option<String> = None;
    let mut current_item_index: Option<usize> = None;
    let mut total_items: Option<usize> = None;
    let mut current_item_title: Option<String> = None;
    let mut current_track_status: Option<String> = None;
    let mut current_track_progress: Option<f32> = None;
    let mut current_speed: Option<String> = None;
    let mut current_eta: Option<String> = None;

    // 5. stdout / stderr 실시간 스트리밍 루프
    while let Some(event) = rx.recv().await {
        match event {
            // 표준 출력(stdout) 수신 -> 플레이리스트 메타데이터 파싱 및 progress 이벤트 emit
            CommandEvent::Stdout(bytes) => {
                let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
                if !line.is_empty() {
                    // 1) 플레이리스트 제목 감지
                    if let Some(caps) = regexes.re_playlist.captures(&line) {
                        current_playlist_title = Some(caps[1].trim().to_string());
                    }

                    // 2) 플레이리스트 트랙 순서 감지 (예: item 3 of 10)
                    if let Some(caps) = regexes.re_item.captures(&line) {
                        if let (Ok(idx), Ok(total)) =
                            (caps[1].parse::<usize>(), caps[2].parse::<usize>())
                        {
                            current_item_index = Some(idx);
                            total_items = Some(total);
                            current_item_title = None; // 새 트랙 시작이므로 제목 초기화
                            current_track_status = Some("downloading".to_string());
                            current_track_progress = Some(0.0);
                        }
                    }

                    // 3) 영상/음원 파일명 및 트랙 타이틀 감지
                    if let Some(caps) = regexes.re_dest.captures(&line) {
                        let cleaned = clean_title_from_destination(&caps[1]);
                        current_item_title = Some(cleaned);
                    }

                    // 4) 이미 다운로드 완료된 파일 건너뛰기 감지
                    if let Some(caps) = regexes.re_already.captures(&line) {
                        let cleaned = clean_title_from_destination(&caps[1]);
                        current_item_title = Some(cleaned);
                        current_track_status = Some("completed".to_string());
                        current_track_progress = Some(100.0);
                    }

                    // 5) 오디오 변환 및 앨범아트 처리 단계 감지
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

                    // 6) 실시간 진행률(%) 파싱
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

                    // 7) 개별 트랙 완료 감지 (변환 후 원본 파일 삭제 또는 100% 완료)
                    if line.contains("Deleting original file") {
                        current_track_status = Some("completed".to_string());
                        current_track_progress = Some(100.0);
                    }

                    // 8) 다운로드 속도 및 ETA 파싱
                    if let Some(caps) = regexes.re_speed.captures(&line) {
                        current_speed = Some(caps[1].to_string());
                    }
                    if let Some(caps) = regexes.re_eta.captures(&line) {
                        current_eta = Some(caps[1].to_string());
                    }

                    // 구조화된 진행률 페이로드 emit
                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: line.clone(),
                            message: line,
                            is_error: false,
                            playlist_title: current_playlist_title.clone(),
                            item_index: current_item_index,
                            total_items,
                            item_title: current_item_title.clone(),
                            track_progress: current_track_progress,
                            track_status: current_track_status.clone(),
                            speed: current_speed.clone(),
                            eta: current_eta.clone(),
                        },
                    );
                }
            }
            // 표준 에러(stderr) 수신 -> 에러 이벤트 emit
            CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
                if !line.is_empty() {
                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            line: line.clone(),
                            message: line,
                            is_error: true,
                            playlist_title: current_playlist_title.clone(),
                            item_index: current_item_index,
                            total_items,
                            item_title: current_item_title.clone(),
                            track_progress: current_track_progress,
                            track_status: Some("failed".to_string()),
                            speed: current_speed.clone(),
                            eta: current_eta.clone(),
                        },
                    );
                }
            }
            // 프로세스 종료 시그널 수신
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
                if payload.code != Some(0) {
                    exit_success = false;
                }
            }
            // 내부 채널/파이프 에러 수신
            CommandEvent::Error(err) => {
                let err_msg = format!("실행 오류: {err}");
                let _ = app.emit(
                    "download-progress",
                    ProgressPayload {
                        line: err_msg.clone(),
                        message: err_msg,
                        is_error: true,
                        playlist_title: current_playlist_title.clone(),
                        item_index: current_item_index,
                        total_items,
                        item_title: current_item_title.clone(),
                        track_progress: current_track_progress,
                        track_status: Some("failed".to_string()),
                        speed: current_speed.clone(),
                        eta: current_eta.clone(),
                    },
                );
                exit_success = false;
            }
            _ => {}
        }
    }

    // 6. 완료 후 활성 PID 목록에서 해제
    state.unregister_pid(pid);

    // 7. 최종 실행 결과 반환
    if exit_success {
        if !actual_download_dir.is_empty() {
            let _ = crate::nfc::normalize_directory_nfc(std::path::Path::new(&actual_download_dir));
        }
        Ok("플레이리스트 및 오디오 다운로드가 완료되었습니다.".into())
    } else {
        Err(crate::AppError::DownloadError(format!(
            "다운로드 실패 (종료 코드: {:?})",
            exit_code.unwrap_or(-1)
        )))
    }
}
