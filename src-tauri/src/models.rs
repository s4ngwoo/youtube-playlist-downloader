/// 프론트엔드로 실시간 전달할 다운로드 진행률 이벤트 페이로드 (플레이리스트 확장 지원)
#[derive(Clone, serde::Serialize)]
pub struct ProgressPayload {
    /// 터미널 출력 한 줄 (stdout 또는 stderr 내용)
    pub line: String,
    /// 프론트엔드 호환용 메시지 필드 (line과 동일)
    pub message: String,
    /// 에러 메시지 여부 (stderr 출력인 경우 true)
    pub is_error: bool,

    // ===== 플레이리스트 및 개별 트랙 진행률 정보 =====
    /// 플레이리스트 명 (플레이리스트인 경우 식별)
    pub playlist_title: Option<String>,
    /// 현재 트랙 번호 (1부터 시작, e.g. 3)
    pub item_index: Option<usize>,
    /// 플레이리스트 전체 곡 수 (e.g. 10)
    pub total_items: Option<usize>,
    /// 현재 처리 중인 트랙 제목
    pub item_title: Option<String>,
    /// 현재 트랙의 진행률 (0.0 ~ 100.0)
    pub track_progress: Option<f32>,
    /// 현재 트랙 상태 ("pending" | "downloading" | "extracting" | "completed" | "failed")
    pub track_status: Option<String>,
    /// 실시간 다운로드 속도 (예: "2.45MiB/s")
    pub speed: Option<String>,
    /// 예상 남은 시간 (예: "00:15")
    pub eta: Option<String>,
    /// 실패 시 에러 메시지
    pub error_message: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AudioMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub lyrics: Option<String>,
    pub cover_art_base64: Option<String>,
    pub comment: Option<String>,
    pub custom_tags: Option<std::collections::HashMap<String, String>>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AudioFileEntry {
    pub file_name: String,
    pub file_path: String,
    pub metadata: AudioMetadata,
}
