use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// OS별 자식 프로세스 강제 종료 유틸리티
pub fn kill_process_by_pid(pid: u32) {
    #[cfg(unix)]
    {
        // macOS 및 Linux: SIGKILL(-9) 신호 전송
        let _ = std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }
    #[cfg(windows)]
    {
        // Windows: taskkill /F /T (하위 프로세스 트리까지 강제 종료)
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output();
    }
}

/// 실행 중인 자식 프로세스(PID)들을 추적하여 '좀비 프로세스' 발생을 방지하는 상태 구조체
#[derive(Default, Clone)]
pub struct AppState {
    /// 현재 활성화된 yt-dlp 자식 프로세스들의 PID 목록
    pub active_pids: Arc<Mutex<Vec<u32>>>,
    /// 사용자가 취소를 요청하면 true. kill_all 이후에도 대기열 항목이 spawn되지 않게 한다.
    cancelled: Arc<AtomicBool>,
}

impl AppState {
    /// 새로운 자식 프로세스 PID 등록
    pub fn register_pid(&self, pid: u32) {
        if let Ok(mut pids) = self.active_pids.lock() {
            pids.push(pid);
            println!("[ProcessManager] 자식 PID 등록: {}", pid);
        }
    }

    /// 정상 종료되거나 중단된 PID 제거
    pub fn unregister_pid(&self, pid: u32) {
        if let Ok(mut pids) = self.active_pids.lock() {
            pids.retain(|&p| p != pid);
            println!("[ProcessManager] 자식 PID 해제: {}", pid);
        }
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    pub fn clear_cancelled(&self) {
        self.cancelled.store(false, Ordering::SeqCst);
    }

    /// 실행 중인 모든 자식 프로세스를 강제 종료 (클린업)
    pub fn kill_all(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Ok(mut pids) = self.active_pids.lock() {
            for &pid in pids.iter() {
                println!(
                    "[ProcessManager] 좀비 프로세스 방지를 위한 강제 종료 실행 (PID: {})",
                    pid
                );
                kill_process_by_pid(pid);
            }
            pids.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kill_all_sets_cancelled_and_clear_resets_it() {
        let state = AppState::default();
        assert!(!state.is_cancelled());
        state.kill_all();
        assert!(state.is_cancelled());
        state.clear_cancelled();
        assert!(!state.is_cancelled());
    }

    #[test]
    fn cloned_state_shares_cancelled_flag() {
        let state = AppState::default();
        let cloned = state.clone();
        state.kill_all();
        assert!(cloned.is_cancelled());
    }
}
