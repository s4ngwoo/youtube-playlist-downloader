use crate::services::logger::{self, LogEntry};
use tauri::Manager;

/// OS 기본 다운로드 디렉토리 경로 반환 커맨드
#[tauri::command]
pub fn get_default_download_dir(app: tauri::AppHandle) -> Result<String, crate::AppError> {
    app.path()
        .download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| crate::AppError::Unknown(e.to_string()))
}

/// 모바일 호환(Android/Windows)을 위한 NFC 정규화 ZIP 생성 Command
#[tauri::command]
pub async fn create_mobile_zip(download_dir: String) -> Result<String, crate::AppError> {
    crate::services::export::create_mobile_zip(download_dir)
}

/// 앱 로그 파일의 절대 경로 반환
#[tauri::command]
pub fn get_app_log_path() -> Result<String, crate::AppError> {
    match logger::log_path() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err(crate::AppError::Unknown("error.logger_not_ready".into())),
    }
}

/// 앱 로그를 읽어 파싱된 항목 목록 반환 (기본 최근 2000줄)
#[tauri::command]
pub fn read_app_logs(max_lines: Option<usize>) -> Result<Vec<LogEntry>, crate::AppError> {
    Ok(logger::read_logs(max_lines.unwrap_or(2000)))
}

/// 앱 로그 파일 초기화 (비우기)
#[tauri::command]
pub fn clear_app_logs() -> Result<String, crate::AppError> {
    logger::clear_logs().map_err(|e| crate::AppError::FileSystemError(e.to_string()))?;
    logger::info("app", "사용자가 로그를 수동으로 초기화했습니다.");
    Ok("ok.logs_cleared".into())
}

/// 별도의 로그 뷰어 윈도우 열기 (또는 이미 열려있는 경우 포커스)
#[tauri::command]
pub async fn open_log_window(app: tauri::AppHandle) -> Result<(), crate::AppError> {
    if let Some(window) = app.get_webview_window("log-viewer") {
        let _ = window.show();
        let _ = window.unminimize();
        window
            .set_focus()
            .map_err(|e| crate::AppError::Unknown(e.to_string()))?;
    } else {
        tauri::WebviewWindowBuilder::new(
            &app,
            "log-viewer",
            tauri::WebviewUrl::App("/?window=log".into()),
        )
        .title("Application Logs")
        .inner_size(800.0, 600.0)
        .min_inner_size(480.0, 360.0)
        .center()
        .build()
        .map_err(|e| crate::AppError::Unknown(e.to_string()))?;
    }
    Ok(())
}

/// 환경 진단 (FFmpeg / Deno / 사이드카 · yt-dlp 오버라이드)
#[tauri::command]
pub fn diagnose_environment(
    app: tauri::AppHandle,
) -> Result<crate::services::environment::EnvironmentReport, crate::AppError> {
    let ytdlp = crate::services::ytdlp_update::status(&app)?;
    let report = crate::services::environment::collect_environment_report(
        ytdlp.source,
        ytdlp.version,
        ytdlp.path,
    );
    logger::info(
        "environment",
        &format!(
            "환경 진단 — os={}/{} ffmpeg={} ({}) deno={} sidecar={} ytdlp_source={} ytdlp_version={}",
            report.os,
            report.arch,
            report.ffmpeg_location.as_deref().unwrap_or("(없음)"),
            report.ffmpeg_source.as_deref().unwrap_or("-"),
            report.deno_path.as_deref().unwrap_or("(없음)"),
            report.sidecar_expected_name,
            report.ytdlp_source,
            report.ytdlp_version.as_deref().unwrap_or("(unknown)")
        ),
    );
    for w in &report.warnings {
        logger::warn("environment", w);
    }
    Ok(report)
}

/// 현재 yt-dlp 소스(번들/오버라이드)·버전
#[tauri::command]
pub fn ytdlp_status(
    app: tauri::AppHandle,
) -> Result<crate::services::ytdlp_update::YtdlpStatus, crate::AppError> {
    crate::services::ytdlp_update::status(&app)
}

/// GitHub latest 자산으로 앱 데이터 오버라이드 바이너리 설치
#[tauri::command]
pub fn update_ytdlp(
    app: tauri::AppHandle,
) -> Result<crate::services::ytdlp_update::YtdlpStatus, crate::AppError> {
    crate::services::ytdlp_update::download_latest_override(&app)
}
