use crate::models::{AudioFileEntry, AudioMetadata};

#[tauri::command]
pub fn list_audio_files(dir_path: String) -> Result<Vec<AudioFileEntry>, crate::AppError> {
    crate::services::metadata::list_audio_files(dir_path)
}

#[tauri::command]
pub fn read_metadata(file_path: String) -> Result<AudioMetadata, crate::AppError> {
    crate::services::metadata::read_metadata(file_path)
}

#[tauri::command]
pub fn write_metadata(
    file_path: String,
    metadata: AudioMetadata,
) -> Result<String, crate::AppError> {
    crate::services::metadata::write_metadata(file_path, metadata)
}
