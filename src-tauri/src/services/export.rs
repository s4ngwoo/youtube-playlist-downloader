use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

use unicode_normalization::UnicodeNormalization;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

/// True when the path looks like an audio file we package for mobile export.
pub(crate) fn is_exportable_audio(path: &Path) -> bool {
    path.extension().and_then(|s| s.to_str()).map(|e| {
        let e = e.to_ascii_lowercase();
        e == "m4a" || e == "mp3"
    }) == Some(true)
}

/// NFC-normalized ZIP of m4a/mp3 files for Android/Windows mobile transfer.
pub fn create_mobile_zip(download_dir: String) -> Result<String, crate::AppError> {
    let dir_path = Path::new(&download_dir);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(crate::AppError::FileSystemError(
            "error.invalid_download_dir".into(),
        ));
    }

    let zip_path = dir_path.join("Mobile_Export.zip");
    let zip_file = File::create(&zip_path)
        .map_err(|e| crate::AppError::FileSystemError(format!("ZIP 파일 생성 실패: {}", e)))?;
    let mut zip = ZipWriter::new(zip_file);

    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let entries = std::fs::read_dir(dir_path)
        .map_err(|e| crate::AppError::FileSystemError(format!("디렉토리 읽기 실패: {}", e)))?;

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

        if !is_exportable_audio(&path) {
            continue;
        }

        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };

        let normalized_name = file_name.nfc().collect::<String>();

        let mut f = File::open(&path).map_err(|e| {
            crate::AppError::FileSystemError(format!("파일 열기 실패 ({}): {}", file_name, e))
        })?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer).map_err(|e| {
            crate::AppError::FileSystemError(format!("파일 읽기 실패 ({}): {}", file_name, e))
        })?;

        zip.start_file(normalized_name, options)
            .map_err(|e| crate::AppError::FileSystemError(format!("ZIP 항목 생성 실패: {}", e)))?;
        zip.write_all(&buffer)
            .map_err(|e| crate::AppError::FileSystemError(format!("ZIP 쓰기 실패: {}", e)))?;

        file_count += 1;
    }

    zip.finish()
        .map_err(|e| crate::AppError::FileSystemError(format!("ZIP 파일 완성 실패: {}", e)))?;

    if file_count == 0 {
        let _ = std::fs::remove_file(zip_path);
        return Err(crate::AppError::FileSystemError(
            "error.no_audio_for_zip".into(),
        ));
    }

    Ok(format!("ok.zip_created:{file_count}"))
}
