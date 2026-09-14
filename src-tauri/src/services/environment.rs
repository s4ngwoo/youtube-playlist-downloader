use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

use crate::services::logger;

static DENO_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();
static FFMPEG_LOCATION: OnceLock<Option<FfmpegResolve>> = OnceLock::new();

#[derive(Debug, Clone)]
struct FfmpegResolve {
    /// Directory passed to yt-dlp `--ffmpeg-location`.
    location: String,
    /// `bundled` (sidecar) or `system` (PATH / known install dirs).
    source: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentReport {
    pub ffmpeg_found: bool,
    pub ffmpeg_location: Option<String>,
    /// `bundled` | `system` when found.
    pub ffmpeg_source: Option<String>,
    pub deno_found: bool,
    pub deno_path: Option<String>,
    pub sidecar_expected_name: String,
    pub ffmpeg_expected_name: String,
    pub os: String,
    pub arch: String,
    pub warnings: Vec<String>,
    pub install_hints: Vec<String>,
    pub ytdlp_source: String,
    pub ytdlp_version: Option<String>,
    pub ytdlp_path: Option<String>,
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

/// 현재 빌드 타깃에 대응하는 번들 ffmpeg 사이드카 파일명 힌트
pub fn expected_ffmpeg_sidecar_name() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    match (os, arch) {
        ("macos", "aarch64") => "ffmpeg-aarch64-apple-darwin".into(),
        ("macos", "x86_64") => "ffmpeg-x86_64-apple-darwin".into(),
        ("windows", "x86_64") => "ffmpeg-x86_64-pc-windows-msvc.exe".into(),
        ("windows", "aarch64") => "ffmpeg-aarch64-pc-windows-msvc.exe".into(),
        ("linux", "x86_64") => "ffmpeg-x86_64-unknown-linux-gnu".into(),
        ("linux", "aarch64") => "ffmpeg-aarch64-unknown-linux-gnu".into(),
        _ => format!("ffmpeg-{arch}-{os}"),
    }
}

/// Bundled sidecar candidates: next to the app binary (release) and `src-tauri/bin` (dev).
fn bundled_ffmpeg_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    let exe_name = executable_name("ffmpeg");
    let triple_name = expected_ffmpeg_sidecar_name();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            // Production: Tauri strips the triple → `ffmpeg` / `ffmpeg.exe` beside the app.
            if parent.join(&exe_name).is_file() {
                dirs.push(parent.to_path_buf());
            }
            // Dev / some layouts keep the triple-suffixed name beside the binary.
            if parent.join(&triple_name).is_file() {
                dirs.push(parent.to_path_buf());
            }
        }
    }

    let manifest_bin = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("bin");
    if manifest_bin.join(&triple_name).is_file() || manifest_bin.join(&exe_name).is_file() {
        dirs.push(manifest_bin);
    }

    dirs
}

/// Prefer release-layout `ffmpeg` over the triple-suffixed sidecar in the same directory.
fn pick_ffmpeg_in_dir(
    dir: &Path,
    exe_name: &str,
    triple_name: &str,
    source: &'static str,
) -> Option<FfmpegResolve> {
    if dir.join(exe_name).is_file() {
        return Some(FfmpegResolve {
            location: dir.to_string_lossy().to_string(),
            source,
        });
    }
    if source == "bundled" {
        let triple_path = dir.join(triple_name);
        if triple_path.is_file() {
            return Some(FfmpegResolve {
                location: triple_path.to_string_lossy().to_string(),
                source,
            });
        }
    }
    None
}

fn resolve_ffmpeg_from_search_dirs(
    bundled_dirs: &[PathBuf],
    system_dirs: &[PathBuf],
    exe_name: &str,
    triple_name: &str,
) -> Option<FfmpegResolve> {
    for dir in bundled_dirs {
        if let Some(found) = pick_ffmpeg_in_dir(dir, exe_name, triple_name, "bundled") {
            return Some(found);
        }
    }
    for dir in system_dirs {
        if let Some(found) = pick_ffmpeg_in_dir(dir, exe_name, triple_name, "system") {
            return Some(found);
        }
    }
    None
}

fn resolve_ffmpeg() -> Option<FfmpegResolve> {
    let exe_name = executable_name("ffmpeg");
    let triple_name = expected_ffmpeg_sidecar_name();

    if let Some(found) =
        resolve_ffmpeg_from_search_dirs(&bundled_ffmpeg_dirs(), &[], &exe_name, &triple_name)
    {
        return Some(found);
    }

    if let Some(from_path) = find_in_path("ffmpeg") {
        if let Some(parent) = from_path.parent() {
            return Some(FfmpegResolve {
                location: parent.to_string_lossy().to_string(),
                source: "system",
            });
        }
    }

    if let Some(found) =
        resolve_ffmpeg_from_search_dirs(&[], &ffmpeg_candidate_dirs(), &exe_name, &triple_name)
    {
        return Some(found);
    }

    // Last resort: ffmpeg on PATH without resolved absolute path
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-version");
    if cmd.output().map(|o| o.status.success()).unwrap_or(false) {
        return Some(FfmpegResolve {
            location: "ffmpeg".to_string(),
            source: "system",
        });
    }

    None
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

/// 번들 사이드카 우선, 없으면 시스템 ffmpeg 디렉터리(또는 PATH)를 탐색하고 1회 캐싱합니다.
/// yt-dlp `--ffmpeg-location`에 넘길 값을 반환합니다.
pub fn get_ffmpeg_location() -> Option<&'static str> {
    FFMPEG_LOCATION
        .get_or_init(resolve_ffmpeg)
        .as_ref()
        .map(|r| r.location.as_str())
}

pub fn get_ffmpeg_source() -> Option<&'static str> {
    FFMPEG_LOCATION
        .get_or_init(resolve_ffmpeg)
        .as_ref()
        .map(|r| r.source)
}

pub fn ffmpeg_missing_message() -> String {
    "error.ffmpeg_missing".to_string()
}

pub fn ffmpeg_missing_detail() -> String {
    let expected = expected_ffmpeg_sidecar_name();
    format!(
        "FFmpeg를 찾을 수 없습니다. 오디오 추출·썸네일 임베딩에 필요합니다.\n\
         \n\
         공식 빌드는 LGPL FFmpeg를 앱과 함께 번들합니다. 이 메시지가 보이면 설치가 손상되었거나 \
         개발 환경에서 사이드카가 없을 수 있습니다.\n\
         \n\
         개발: `scripts/prepare-ffmpeg-sidecar.sh` 로 `{expected}` 를 준비하세요.\n\
         사용자: 앱을 다시 설치하거나, 임시로 시스템 FFmpeg를 PATH에 두세요.\n\
         라이선스: docs/THIRD_PARTY.md (FFmpeg LGPL)"
    )
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
        logger::info("environment", &format!("Deno 감지: {}", path.display()));
    }
}

/// FFmpeg가 없으면 안정 코드로 에러를 반환합니다 (상세는 로그).
pub fn ensure_ffmpeg_available() -> Result<(), crate::AppError> {
    match get_ffmpeg_location() {
        Some(loc) => {
            let source = get_ffmpeg_source().unwrap_or("unknown");
            logger::info("environment", &format!("FFmpeg 위치({source}): {loc}"));
            Ok(())
        }
        None => {
            let detail = ffmpeg_missing_detail();
            logger::error("environment", &detail);
            Err(crate::AppError::DownloadError(ffmpeg_missing_message()))
        }
    }
}

pub fn sidecar_error_message(raw: impl std::fmt::Display) -> String {
    let expected = expected_sidecar_name();
    logger::error(
        "environment",
        &format!(
            "yt-dlp 사이드카를 준비할 수 없습니다: {raw}\n\
             이 플랫폼에 필요한 파일명: `{expected}`"
        ),
    );
    format!("error.sidecar_unavailable:{expected}")
}

/// 환경 진단 스냅샷 (UI / 로그용)
/// `warnings` / `install_hints`는 FE i18n용 안정 코드.
pub fn collect_environment_report(
    ytdlp_source: String,
    ytdlp_version: Option<String>,
    ytdlp_path: Option<String>,
) -> EnvironmentReport {
    let ffmpeg_location = get_ffmpeg_location().map(|s| s.to_string());
    let ffmpeg_source = get_ffmpeg_source().map(|s| s.to_string());
    let deno_path = get_deno_path().map(|p| p.to_string_lossy().to_string());
    let mut warnings = Vec::new();
    let mut install_hints = Vec::new();

    if ffmpeg_location.is_none() {
        warnings.push("warn.ffmpeg_missing".into());
        install_hints.push("hint.ffmpeg.bundled".into());
        install_hints.push("hint.ffmpeg.macos".into());
        install_hints.push("hint.ffmpeg.windows".into());
    }
    if deno_path.is_none() {
        warnings.push("warn.deno_missing".into());
        install_hints.push("hint.deno.macos".into());
        install_hints.push("hint.deno.windows".into());
    }

    EnvironmentReport {
        ffmpeg_found: ffmpeg_location.is_some(),
        ffmpeg_location,
        ffmpeg_source,
        deno_found: deno_path.is_some(),
        deno_path,
        sidecar_expected_name: expected_sidecar_name(),
        ffmpeg_expected_name: expected_ffmpeg_sidecar_name(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        warnings,
        install_hints,
        ytdlp_source,
        ytdlp_version,
        ytdlp_path,
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
    fn expected_ffmpeg_sidecar_name_is_non_empty() {
        let name = expected_ffmpeg_sidecar_name();
        assert!(!name.is_empty());
        assert!(name.contains("ffmpeg"));
    }

    #[test]
    fn sidecar_error_message_includes_expected_name() {
        let expected = expected_sidecar_name();
        let msg = sidecar_error_message("boom");
        assert!(msg.starts_with("error.sidecar_unavailable:"));
        assert!(msg.contains(&expected));
    }

    #[test]
    fn ffmpeg_missing_message_is_stable_code() {
        let msg = ffmpeg_missing_message();
        assert_eq!(msg, "error.ffmpeg_missing");
        let detail = ffmpeg_missing_detail();
        assert!(detail.contains("FFmpeg"));
        assert!(detail.contains("prepare-ffmpeg-sidecar") || detail.contains("LGPL"));
    }

    #[test]
    fn deno_missing_warning_is_advisory() {
        let msg = deno_missing_warning();
        assert!(msg.contains("Deno"));
        assert!(!msg.contains("실패합니다")); // soft warning, not hard fail copy
    }

    #[test]
    fn environment_report_uses_stable_codes_when_missing() {
        // Force-path: if tools are missing on CI/dev machines, codes must be stable.
        // When present, arrays may be empty — that's fine.
        let report = collect_environment_report("bundled".into(), None, None);
        for w in &report.warnings {
            assert!(
                w.starts_with("warn."),
                "warning should be a stable code, got {w}"
            );
        }
        for h in &report.install_hints {
            assert!(
                h.starts_with("hint."),
                "hint should be a stable code, got {h}"
            );
        }
        if !report.ffmpeg_found {
            assert!(report.warnings.iter().any(|w| w == "warn.ffmpeg_missing"));
            assert!(report
                .install_hints
                .iter()
                .any(|h| h == "hint.ffmpeg.bundled"));
        }
        if !report.deno_found {
            assert!(report.warnings.iter().any(|w| w == "warn.deno_missing"));
        }
        assert!(!report.ffmpeg_expected_name.is_empty());
    }

    fn touch(path: &std::path::Path) {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(path, []).unwrap();
    }

    #[test]
    fn pick_ffmpeg_prefers_plain_name_over_triple_in_the_same_dir() {
        let dir = tempfile::tempdir().unwrap();
        let exe_name = executable_name("ffmpeg");
        let triple_name = "ffmpeg-x86_64-unknown-linux-gnu";
        touch(&dir.path().join(&exe_name));
        touch(&dir.path().join(triple_name));

        let found = pick_ffmpeg_in_dir(dir.path(), &exe_name, triple_name, "bundled").unwrap();
        assert_eq!(found.source, "bundled");
        assert_eq!(found.location, dir.path().to_string_lossy().to_string());
        assert!(!found.location.ends_with(triple_name));
    }

    #[test]
    fn pick_ffmpeg_uses_triple_file_path_when_plain_name_is_absent() {
        let dir = tempfile::tempdir().unwrap();
        let exe_name = executable_name("ffmpeg");
        let triple_name = "ffmpeg-aarch64-apple-darwin";
        let triple_path = dir.path().join(triple_name);
        touch(&triple_path);

        let found = pick_ffmpeg_in_dir(dir.path(), &exe_name, triple_name, "bundled").unwrap();
        assert_eq!(found.source, "bundled");
        assert_eq!(found.location, triple_path.to_string_lossy().to_string());
    }

    #[test]
    fn system_pick_ignores_triple_sidecar_names() {
        let dir = tempfile::tempdir().unwrap();
        let exe_name = executable_name("ffmpeg");
        let triple_name = "ffmpeg-x86_64-unknown-linux-gnu";
        touch(&dir.path().join(triple_name));

        assert!(pick_ffmpeg_in_dir(dir.path(), &exe_name, triple_name, "system").is_none());
    }

    #[test]
    fn bundled_search_dirs_win_over_system_dirs() {
        let bundled = tempfile::tempdir().unwrap();
        let system = tempfile::tempdir().unwrap();
        let exe_name = executable_name("ffmpeg");
        let triple_name = "ffmpeg-x86_64-pc-windows-msvc.exe";
        touch(&bundled.path().join(&exe_name));
        touch(&system.path().join(&exe_name));

        let found = resolve_ffmpeg_from_search_dirs(
            &[bundled.path().to_path_buf()],
            &[system.path().to_path_buf()],
            &exe_name,
            triple_name,
        )
        .unwrap();
        assert_eq!(found.source, "bundled");
        assert_eq!(found.location, bundled.path().to_string_lossy().to_string());
    }

    #[test]
    fn empty_search_dirs_yield_none() {
        let exe_name = executable_name("ffmpeg");
        assert!(resolve_ffmpeg_from_search_dirs(&[], &[], &exe_name, "ffmpeg-triple").is_none());
    }
}
