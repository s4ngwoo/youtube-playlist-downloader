use std::fs;
use std::path::{Path, PathBuf};
use unicode_normalization::UnicodeNormalization;

/// 문자열을 Unicode NFC로 정규화합니다 (순수 함수, 테스트용으로도 사용).
pub fn name_to_nfc(name: &str) -> String {
    name.nfc().collect()
}

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

    let normalized_name = name_to_nfc(original_name);

    if original_name != normalized_name {
        let new_path = parent.join(&normalized_name);
        fs::rename(file_path, &new_path).map_err(|e| format!("파일 이름 변경 실패: {}", e))?;
        Ok(new_path)
    } else {
        Ok(file_path.to_path_buf())
    }
}

/// 디렉토리 내의 오디오 파일(.m4a / .mp3) 파일명을 NFC로 변환합니다.
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
                let ext_l = ext.to_ascii_lowercase();
                if ext_l == "m4a" || ext_l == "mp3" {
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

#[cfg(test)]
mod tests {
    use super::*;
    use unicode_normalization::UnicodeNormalization;

    #[test]
    fn name_to_nfc_composes_decomposed_hangul() {
        // "각" as NFD: ㄱ + ㅏ + ㄱ
        let nfd: String = "각".nfd().collect();
        assert_ne!(nfd, "각");
        assert_eq!(name_to_nfc(&nfd), "각");
    }

    #[test]
    fn name_to_nfc_keeps_already_composed() {
        assert_eq!(name_to_nfc("한글파일.m4a"), "한글파일.m4a");
    }

    #[test]
    fn name_to_nfc_ascii_unchanged() {
        assert_eq!(name_to_nfc("track-01.m4a"), "track-01.m4a");
    }
}
