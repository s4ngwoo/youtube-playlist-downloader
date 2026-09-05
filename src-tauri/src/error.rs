use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("다운로드 실패: {0}")]
    DownloadError(String),

    #[error("메타데이터 오류: {0}")]
    MetadataError(String),

    #[error("파일 시스템 오류: {0}")]
    FileSystemError(String),

    #[error("알 수 없는 오류: {0}")]
    Unknown(String),
}

// Tauri IPC에서 사용할 수 있도록 Serialize 구현
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
