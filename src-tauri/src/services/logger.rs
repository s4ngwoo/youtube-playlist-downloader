use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use chrono::Local;
use serde::{Deserialize, Serialize};

// 로그 레벨
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Info => write!(f, "INFO"),
            LogLevel::Warn => write!(f, "WARN"),
            LogLevel::Error => write!(f, "ERROR"),
        }
    }
}

// 로그 항목 구조체 (프론트엔드 반환용)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub level: LogLevel,
    pub timestamp: String,
    pub source: String,
    pub message: String,
}

// 전역 로그 파일 경로 (OnceLock으로 1회 초기화)
static LOG_PATH: OnceLock<PathBuf> = OnceLock::new();
// 파일 I/O 경합 방지용 Mutex
static LOG_MUTEX: Mutex<()> = Mutex::new(());

/// 로거 초기화: 앱 시작 시 1회 호출, 로그 파일 경로 설정
pub fn init(log_dir: PathBuf) {
    let log_file = log_dir.join("app.log");
    let _ = fs::create_dir_all(&log_dir);
    LOG_PATH.get_or_init(|| log_file);
    info("app", "=== 애플리케이션 시작 ===");
}

/// 로그 파일 경로 반환
pub fn log_path() -> Option<&'static PathBuf> {
    LOG_PATH.get()
}

/// INFO 레벨 로그 기록
pub fn info(source: &str, message: &str) {
    write_log(LogLevel::Info, source, message);
}

/// WARN 레벨 로그 기록
pub fn warn(source: &str, message: &str) {
    write_log(LogLevel::Warn, source, message);
}

/// ERROR 레벨 로그 기록
pub fn error(source: &str, message: &str) {
    write_log(LogLevel::Error, source, message);
}

fn write_log(level: LogLevel, source: &str, message: &str) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let line = format!("[{}] [{}] [{}] {}\n", timestamp, level, source, message);

    // 콘솔에도 출력 (기존 println! 동작 유지)
    print!("{}", line);

    // Mutex로 보호된 파일 쓰기
    if let Some(path) = LOG_PATH.get() {
        let _guard = LOG_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
            let _ = file.write_all(line.as_bytes());
        }
    }
}

/// 로그 파일을 읽어 파싱된 LogEntry 목록 반환
pub fn read_logs(max_lines: usize) -> Vec<LogEntry> {
    let path = match LOG_PATH.get() {
        Some(p) => p,
        None => return vec![],
    };

    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let lines: Vec<&str> = content.lines().collect();
    let start = if lines.len() > max_lines { lines.len() - max_lines } else { 0 };

    lines[start..]
        .iter()
        .filter_map(|line| parse_log_line(line))
        .collect()
}

/// 로그 파일 비우기
pub fn clear_logs() -> std::io::Result<()> {
    if let Some(path) = LOG_PATH.get() {
        let _guard = LOG_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
        fs::write(path, "")?;
    }
    Ok(())
}

/// 로그 파일 크기(바이트) 반환
pub fn log_file_size() -> u64 {
    LOG_PATH.get()
        .and_then(|p| fs::metadata(p).ok())
        .map(|m| m.len())
        .unwrap_or(0)
}

/// 로그 한 줄을 파싱하여 LogEntry로 변환
fn parse_log_line(line: &str) -> Option<LogEntry> {
    // 형식: [2026-09-05 22:15:01] [INFO] [download] 메시지
    if !line.starts_with('[') {
        return None;
    }

    let mut rest = line;

    // timestamp
    let ts_end = rest.find(']')?;
    let timestamp = rest[1..ts_end].to_string();
    rest = rest[ts_end + 2..].trim_start(); // "] " 이후

    // level
    let level_end = rest.find(']')?;
    let level_str = &rest[1..level_end];
    let level = match level_str {
        "INFO" => LogLevel::Info,
        "WARN" => LogLevel::Warn,
        "ERROR" => LogLevel::Error,
        _ => return None,
    };
    rest = rest[level_end + 2..].trim_start();

    // source
    let src_end = rest.find(']')?;
    let source = rest[1..src_end].to_string();
    rest = rest[src_end + 2..].trim_start();

    Some(LogEntry {
        level,
        timestamp,
        source,
        message: rest.to_string(),
    })
}
