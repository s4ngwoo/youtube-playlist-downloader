use std::fs;
use std::path::{Path, PathBuf};
use unicode_normalization::UnicodeNormalization;

/// 파일 경로의 마지막 파일명을 NFC로 변환한 뒤 디스크의 파일명을 변경합니다.
pub fn normalize_file_nfc(file_path: &Path) -> Result<PathBuf, String> {
    if !file_path.exists() {
        return Err(format!("파일이 존재하지 않습니다: {}", file_path.display()));
    }

    let parent = file_path.parent().unwrap_or(Path::new(""));
    let original_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("올바르지 않은 파일명입니다.")?;

    let normalized_name: String = original_name.nfc().collect();

    if original_name != normalized_name {
        let new_path = parent.join(&normalized_name);
        fs::rename(file_path, &new_path).map_err(|e| format!("파일 이름 변경 실패: {}", e))?;
        Ok(new_path)
    } else {
        Ok(file_path.to_path_buf())
    }
}

/// 디렉토리 내의 모든 .m4a 파일을 NFC로 변환합니다.
pub fn normalize_directory_nfc(dir_path: &Path) -> Result<usize, String> {
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err("유효하지 않은 다운로드 디렉토리입니다.".into());
    }

    let entries = fs::read_dir(dir_path).map_err(|e| format!("디렉토리 읽기 실패: {}", e))?;
    let mut normalized_count = 0;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if ext == "m4a" {
                    if let Ok(new_path) = normalize_file_nfc(&path) {
                        if new_path != path {
                            normalized_count += 1;
                        }
                    }
                }
            }
        }
    }

    Ok(normalized_count)
}
