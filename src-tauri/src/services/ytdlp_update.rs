use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::services::logger;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YtdlpStatus {
    pub source: String,
    pub version: Option<String>,
    pub path: Option<String>,
    pub override_path: String,
}

fn override_file_name() -> &'static str {
    if cfg!(windows) {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    }
}

pub fn sidecars_dir(app: &AppHandle) -> Result<PathBuf, crate::AppError> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| crate::AppError::Unknown(e.to_string()))?;
    Ok(base.join("sidecars"))
}

pub fn override_binary_path(app: &AppHandle) -> Result<PathBuf, crate::AppError> {
    Ok(sidecars_dir(app)?.join(override_file_name()))
}

pub fn resolve_ytdlp_path(app: &AppHandle) -> (String, Option<PathBuf>) {
    if let Ok(path) = override_binary_path(app) {
        if path.is_file() {
            return ("override".into(), Some(path));
        }
    }
    ("bundled".into(), None)
}

pub fn read_version(bin: &Path) -> Option<String> {
    let output = Command::new(bin).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let version = text.lines().next()?.trim();
    if version.is_empty() {
        None
    } else {
        Some(version.to_string())
    }
}

fn release_asset_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else if cfg!(target_os = "macos") {
        "yt-dlp_macos"
    } else {
        "yt-dlp_linux"
    }
}

pub fn download_latest_override(app: &AppHandle) -> Result<YtdlpStatus, crate::AppError> {
    let dir = sidecars_dir(app)?;
    fs::create_dir_all(&dir)
        .map_err(|e| crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}")))?;

    let dest = override_binary_path(app)?;
    let tmp = dest.with_extension("tmp");
    let asset = release_asset_name();
    let url = format!("https://github.com/yt-dlp/yt-dlp/releases/latest/download/{asset}");

    logger::info("ytdlp", &format!("yt-dlp 오버라이드 다운로드 시작: {url}"));

    let response = reqwest::blocking::get(&url)
        .map_err(|e| crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}")))?;

    if !response.status().is_success() {
        return Err(crate::AppError::DownloadError(format!(
            "error.ytdlp_update_failed:HTTP {}",
            response.status()
        )));
    }

    let bytes = response
        .bytes()
        .map_err(|e| crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}")))?;

    {
        let mut file = fs::File::create(&tmp).map_err(|e| {
            crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}"))
        })?;
        file.write_all(&bytes).map_err(|e| {
            crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}"))
        })?;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&tmp)
            .map_err(|e| crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}")))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&tmp, perms).map_err(|e| {
            crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}"))
        })?;
    }

    fs::rename(&tmp, &dest)
        .map_err(|e| crate::AppError::DownloadError(format!("error.ytdlp_update_failed:{e}")))?;

    let version = read_version(&dest);
    logger::info(
        "ytdlp",
        &format!(
            "yt-dlp 오버라이드 설치 완료: {} (version={})",
            dest.display(),
            version.as_deref().unwrap_or("?")
        ),
    );

    Ok(YtdlpStatus {
        source: "override".into(),
        version,
        path: Some(dest.to_string_lossy().to_string()),
        override_path: dest.to_string_lossy().to_string(),
    })
}

pub fn status(app: &AppHandle) -> Result<YtdlpStatus, crate::AppError> {
    let override_path = override_binary_path(app)?;
    let (source, path) = resolve_ytdlp_path(app);
    let version = if let Some(ref p) = path {
        read_version(p)
    } else {
        // Bundled sidecar: probe --version via shell sidecar when available.
        None
    };
    Ok(YtdlpStatus {
        source,
        version,
        path: path.map(|p| p.to_string_lossy().to_string()),
        override_path: override_path.to_string_lossy().to_string(),
    })
}
