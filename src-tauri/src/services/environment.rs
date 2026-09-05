use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static DENO_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();
static FFMPEG_LOCATION: OnceLock<Option<String>> = OnceLock::new();

/// 시스템에 설치된 Deno 바이너리 경로를 탐색하고 1회 캐싱합니다.
pub fn get_deno_path() -> Option<&'static Path> {
    DENO_PATH
        .get_or_init(|| {
            let mut candidate_deno_paths = vec![
                PathBuf::from("/opt/homebrew/bin/deno"),
                PathBuf::from("/usr/local/bin/deno"),
            ];
            if let Ok(home) = std::env::var("HOME") {
                candidate_deno_paths.push(PathBuf::from(home).join(".deno/bin/deno"));
            }
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                candidate_deno_paths.push(PathBuf::from(userprofile).join(".deno/bin/deno.exe"));
            }

            candidate_deno_paths.into_iter().find(|path| path.exists())
        })
        .as_deref()
}

/// 시스템에 설치된 ffmpeg 경로 디렉토리를 탐색하고 1회 캐싱합니다.
pub fn get_ffmpeg_location() -> Option<&'static str> {
    FFMPEG_LOCATION
        .get_or_init(|| {
            for dir in ["/opt/homebrew/bin", "/usr/local/bin"] {
                if Path::new(dir).join("ffmpeg").exists() {
                    return Some(dir.to_string());
                }
            }
            None
        })
        .as_deref()
}
