use crate::services::logger;
use std::sync::{Arc, Mutex};

/// OS별 자식 프로세스 강제 종료 유틸리티
pub fn kill_process_by_pid(pid: u32) {
    #[cfg(unix)]
    {
        let _ = std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output();
    }
}

/// 실행 중인 자식 프로세스(PID)들을 추적하여 '좀비 프로세스' 발생을 방지하는 상태 구조체
#[derive(Default, Clone)]
pub struct AppState {
    pub active_pids: Arc<Mutex<Vec<u32>>>,
}

impl AppState {
    pub fn register_pid(&self, pid: u32) {
        if let Ok(mut pids) = self.active_pids.lock() {
            pids.push(pid);
            logger::info("process", &format!("자식 PID 등록: {pid}"));
        }
    }

    pub fn unregister_pid(&self, pid: u32) {
        if let Ok(mut pids) = self.active_pids.lock() {
            pids.retain(|&p| p != pid);
            logger::info("process", &format!("자식 PID 해제: {pid}"));
        }
    }

    pub fn kill_all(&self) {
        if let Ok(mut pids) = self.active_pids.lock() {
            for &pid in pids.iter() {
                logger::warn(
                    "process",
                    &format!("좀비 프로세스 방지를 위한 강제 종료 (PID: {pid})"),
                );
                kill_process_by_pid(pid);
            }
            pids.clear();
        }
    }
}
