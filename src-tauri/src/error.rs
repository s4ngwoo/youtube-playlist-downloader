use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    /// Stable code or detail for FE i18n (`error.*` / free text).
    #[error("download_error: {0}")]
    DownloadError(String),

    #[error("metadata_error: {0}")]
    MetadataError(String),

    #[error("filesystem_error: {0}")]
    FileSystemError(String),

    #[error("unknown_error: {0}")]
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
