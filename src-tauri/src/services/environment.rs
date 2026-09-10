use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

use crate::services::logger;

static DENO_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();
static FFMPEG_LOCATION: OnceLock<Option<String>> = OnceLock::new();

#[derive(Debug, Clone, Serialize)]
pub struct EnvironmentReport {
    pub ffmpeg_found: bool,
    pub ffmpeg_location: Option<String>,
    pub deno_found: bool,
    pub deno_path: Option<String>,
    pub sidecar_expected_name: String,
    pub os: String,
    pub arch: String,
    pub warnings: Vec<String>,
    pub install_hints: Vec<String>,
}

fn executable_name(base: &str) -> String {
    if cfg!(windows) {
        format!("{base}.exe")
    } else {
        base.to_string()
    }
}

fn find_in_path(base: &str) -> Option<PathBuf> {
    let exe = executable_name(base);
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(&exe);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    // Also try bare command resolution (helps when PATH lookup differs)
    let mut cmd = Command::new(if cfg!(windows) { "where" } else { "which" });
    cmd.arg(&exe);
    if let Ok(output) = cmd.output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().next() {
                let p = PathBuf::from(line.trim());
                if p.is_file() {
                    return Some(p);
                }
            }
        }
    }
    None
}

fn ffmpeg_candidate_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
    ];

    if let Ok(home) = std::env::var("HOME") {
        dirs.push(PathBuf::from(&home).join(".local/bin"));
    }

    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        let up = PathBuf::from(userprofile);
        dirs.push(up.join(r"scoop\shims"));
        dirs.push(up.join(r"scoop\apps\ffmpeg\current\bin"));
        dirs.push(up.join(r"AppData\Local\Microsoft\WinGet\Links"));
    }

    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        dirs.push(PathBuf::from(local).join(r"Microsoft\WinGet\Links"));
    }

    if let Ok(program_files) = std::env::var("ProgramFiles") {
        dirs.push(PathBuf::from(&program_files).join(r"ffmpeg\bin"));
        dirs.push(PathBuf::from(program_files).join("ffmpeg"));
    }

    if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
        dirs.push(PathBuf::from(program_files_x86).join(r"ffmpeg\bin"));
    }

    dirs.push(PathBuf::from(r"C:\ffmpeg\bin"));
    dirs.push(PathBuf::from(r"C:\ProgramData\chocolatey\bin"));

    dirs
}

fn deno_candidate_paths() -> Vec<PathBuf> {
    let mut paths = vec![
        PathBuf::from("/opt/homebrew/bin/deno"),
        PathBuf::from("/usr/local/bin/deno"),
    ];

    if let Ok(home) = std::env::var("HOME") {
        paths.push(PathBuf::from(&home).join(".deno/bin/deno"));
        paths.push(PathBuf::from(home).join(".local/bin/deno"));
    }

    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        let up = PathBuf::from(userprofile);
        paths.push(up.join(r".deno\bin\deno.exe"));
        paths.push(up.join(r"scoop\shims\deno.exe"));
        paths.push(up.join(r"AppData\Local\Microsoft\WinGet\Links\deno.exe"));
    }

    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        paths.push(PathBuf::from(local).join(r"Microsoft\WinGet\Links\deno.exe"));
    }

    paths.push(PathBuf::from(r"C:\ProgramData\chocolatey\bin\deno.exe"));
    paths
}

/// 현재 빌드 타깃에 대응하는 yt-dlp 사이드카 파일명 힌트
pub fn expected_sidecar_name() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    match (os, arch) {
        ("macos", "aarch64") => "yt-dlp-aarch64-apple-darwin".into(),
        ("macos", "x86_64") => "yt-dlp-x86_64-apple-darwin".into(),
        ("windows", "x86_64") => "yt-dlp-x86_64-pc-windows-msvc.exe".into(),
        ("windows", "aarch64") => "yt-dlp-aarch64-pc-windows-msvc.exe".into(),
        ("linux", "x86_64") => "yt-dlp-x86_64-unknown-linux-gnu".into(),
        ("linux", "aarch64") => "yt-dlp-aarch64-unknown-linux-gnu".into(),
        _ => format!("yt-dlp-{arch}-{os} (target triple에 맞게 배치)"),
    }
}

/// 시스템에 설치된 Deno 바이너리 경로를 탐색하고 1회 캐싱합니다.
pub fn get_deno_path() -> Option<&'static Path> {
    DENO_PATH
        .get_or_init(|| {
            if let Some(from_path) = find_in_path("deno") {
                return Some(from_path);
            }
            deno_candidate_paths()
                .into_iter()
                .find(|path| path.is_file())
        })
        .as_deref()
}

/// 시스템에 설치된 ffmpeg가 있는 디렉터리(또는 PATH상 위치의 부모)를 탐색하고 1회 캐싱합니다.
/// yt-dlp `--ffmpeg-location`에 넘길 값을 반환합니다.
pub fn get_ffmpeg_location() -> Option<&'static str> {
    FFMPEG_LOCATION
        .get_or_init(|| {
            let exe_name = executable_name("ffmpeg");

            if let Some(from_path) = find_in_path("ffmpeg") {
                if let Some(parent) = from_path.parent() {
                    return Some(parent.to_string_lossy().to_string());
                }
            }

            for dir in ffmpeg_candidate_dirs() {
                if dir.join(&exe_name).is_file() {
                    return Some(dir.to_string_lossy().to_string());
                }
            }

            // Last resort: ffmpeg on PATH without resolved absolute path
            let mut cmd = Command::new("ffmpeg");
            cmd.arg("-version");
            if cmd.output().map(|o| o.status.success()).unwrap_or(false) {
                return Some("ffmpeg".to_string());
            }

            None
        })
        .as_deref()
}

pub fn ffmpeg_missing_message() -> String {
    "FFmpeg를 찾을 수 없습니다. 오디오 추출·썸네일 임베딩에 필요합니다.\n\
     \n\
     설치 안내:\n\
     • macOS: brew install ffmpeg\n\
     • Windows (Chocolatey): choco install ffmpeg\n\
     • Windows (Scoop): scoop install ffmpeg\n\
     • Windows (수동): https://ffmpeg.org/download.html 에서 받아 PATH 또는 C:\\ffmpeg\\bin 에 배치\n\
     \n\
     설치 후 앱을 다시 실행해 주세요. (환경 진단으로 경로를 확인할 수 있습니다)"
        .to_string()
}

pub fn deno_missing_warning() -> String {
    "Deno가 설치되어 있지 않습니다. YouTube JS 챌린지/속도 제한에 취약할 수 있습니다. \
     권장: macOS `brew install deno` / Windows `choco install deno` 후 앱 재시작."
        .to_string()
}

/// Deno 미설치 시 경고만 남기고 다운로드는 계속 진행합니다.
pub fn warn_if_deno_missing() {
    if get_deno_path().is_none() {
        logger::warn("environment", &deno_missing_warning());
    } else if let Some(path) = get_deno_path() {
        logger::info(
            "environment",
            &format!("Deno 감지: {}", path.display()),
        );
    }
}

/// FFmpeg가 없으면 한국어 안내와 함께 에러를 반환합니다.
pub fn ensure_ffmpeg_available() -> Result<(), crate::AppError> {
    match get_ffmpeg_location() {
        Some(loc) => {
            logger::info("environment", &format!("FFmpeg 위치: {loc}"));
            Ok(())
        }
        None => {
            let msg = ffmpeg_missing_message();
            logger::error("environment", &msg);
            Err(crate::AppError::DownloadError(msg))
        }
    }
}

pub fn sidecar_error_message(raw: impl std::fmt::Display) -> String {
    let expected = expected_sidecar_name();
    format!(
        "yt-dlp 사이드카를 준비할 수 없습니다: {raw}\n\
         \n\
         이 플랫폼에 필요한 파일명: `{expected}`\n\
         배치 위치: `src-tauri/bin/{expected}` (개발 빌드) 또는 앱 번들 내부\n\
         다운로드: https://github.com/yt-dlp/yt-dlp/releases"
    )
}

/// 환경 진단 스냅샷 (UI / 로그용)
pub fn collect_environment_report() -> EnvironmentReport {
    let ffmpeg_location = get_ffmpeg_location().map(|s| s.to_string());
    let deno_path = get_deno_path().map(|p| p.to_string_lossy().to_string());
    let mut warnings = Vec::new();
    let mut install_hints = Vec::new();

    if ffmpeg_location.is_none() {
        warnings.push("FFmpeg 미발견 — 다운로드가 실패합니다.".into());
        install_hints.push("macOS: brew install ffmpeg".into());
        install_hints.push("Windows: choco install ffmpeg 또는 scoop install ffmpeg".into());
    }
    if deno_path.is_none() {
        warnings.push(deno_missing_warning());
        install_hints.push("macOS: brew install deno".into());
        install_hints.push("Windows: choco install deno".into());
    }

    EnvironmentReport {
        ffmpeg_found: ffmpeg_location.is_some(),
        ffmpeg_location,
        deno_found: deno_path.is_some(),
        deno_path,
        sidecar_expected_name: expected_sidecar_name(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        warnings,
        install_hints,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expected_sidecar_name_is_non_empty() {
        let name = expected_sidecar_name();
        assert!(!name.is_empty());
        assert!(name.contains("yt-dlp"));
    }

    #[test]
    fn sidecar_error_message_includes_expected_name() {
        let expected = expected_sidecar_name();
        let msg = sidecar_error_message("boom");
        assert!(msg.contains(&expected));
        assert!(msg.contains("boom"));
        assert!(msg.contains("src-tauri/bin/"));
    }

    #[test]
    fn ffmpeg_missing_message_has_install_hints() {
        let msg = ffmpeg_missing_message();
        assert!(msg.contains("FFmpeg"));
        assert!(msg.contains("brew install ffmpeg") || msg.contains("choco install ffmpeg"));
    }

    #[test]
    fn deno_missing_warning_is_advisory() {
        let msg = deno_missing_warning();
        assert!(msg.contains("Deno"));
        assert!(!msg.contains("실패합니다")); // soft warning, not hard fail copy
    }
}
