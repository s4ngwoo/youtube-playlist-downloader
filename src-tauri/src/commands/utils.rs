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
/// macOS의 NFD 파일명을 NFC로 변환하여 ZIP으로 압축합니다.
#[tauri::command]
pub async fn create_mobile_zip(download_dir: String) -> Result<String, crate::AppError> {
    use std::fs::File;
    use std::io::{Read, Write};
    use std::path::Path;
    use unicode_normalization::UnicodeNormalization;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    let dir_path = Path::new(&download_dir);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(crate::AppError::FileSystemError("error.invalid_download_dir".into()));
    }

    let zip_path = dir_path.join("Mobile_Export.zip");
    let zip_file = File::create(&zip_path).map_err(|e| crate::AppError::FileSystemError(format!("ZIP 파일 생성 실패: {}", e)))?;
    let mut zip = ZipWriter::new(zip_file);

    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let entries = std::fs::read_dir(dir_path).map_err(|e| crate::AppError::FileSystemError(format!("디렉토리 읽기 실패: {}", e)))?;
    
    let mut file_count = 0;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        
        let path = entry.path();
        
        if path.is_dir() || path == zip_path {
            continue;
        }

        if path.extension().and_then(|s| s.to_str()).map(|e| {
            let e = e.to_ascii_lowercase();
            e == "m4a" || e == "mp3"
        }) != Some(true)
        {
            continue;
        }

        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };

        let normalized_name = file_name.nfc().collect::<String>();

        let mut f = File::open(&path).map_err(|e| crate::AppError::FileSystemError(format!("파일 열기 실패 ({}): {}", file_name, e)))?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer).map_err(|e| crate::AppError::FileSystemError(format!("파일 읽기 실패 ({}): {}", file_name, e)))?;

        zip.start_file(normalized_name, options)
            .map_err(|e| crate::AppError::FileSystemError(format!("ZIP 항목 생성 실패: {}", e)))?;
        zip.write_all(&buffer)
            .map_err(|e| crate::AppError::FileSystemError(format!("ZIP 쓰기 실패: {}", e)))?;

        file_count += 1;
    }

    zip.finish().map_err(|e| crate::AppError::FileSystemError(format!("ZIP 파일 완성 실패: {}", e)))?;

    if file_count == 0 {
        let _ = std::fs::remove_file(zip_path);
        return Err(crate::AppError::FileSystemError("error.no_audio_for_zip".into()));
    }

    Ok(format!("ok.zip_created:{file_count}"))
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
        window.set_focus().map_err(|e| crate::AppError::Unknown(e.to_string()))?;
    } else {
        tauri::WebviewWindowBuilder::new(&app, "log-viewer", tauri::WebviewUrl::App("/?window=log".into()))
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
            "환경 진단 — os={}/{} ffmpeg={} deno={} sidecar={} ytdlp_source={} ytdlp_version={}",
            report.os,
            report.arch,
            report
                .ffmpeg_location
                .as_deref()
                .unwrap_or("(없음)"),
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

