pub mod commands;
pub mod error;
pub mod models;
pub mod nfc;
pub mod parser;
pub mod process;
pub mod services;

pub use error::AppError;
pub use models::ProgressPayload;
pub use process::AppState;

use tauri::Manager;

#[cfg(target_os = "macos")]
#[allow(deprecated, unexpected_cfgs)]
fn set_dock_icon() {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    #[allow(non_camel_case_types)]
    type id = *mut Object;

    const ICON_BYTES: &[u8] = include_bytes!("../icons/icon.png");

    unsafe {
        let ns_app: id = msg_send![class!(NSApplication), sharedApplication];
        let data: id = msg_send![
            class!(NSData),
            dataWithBytes: ICON_BYTES.as_ptr() as *const std::ffi::c_void
            length: ICON_BYTES.len()
        ];
        if !data.is_null() {
            let ns_image: id = msg_send![class!(NSImage), alloc];
            let app_icon: id = msg_send![ns_image, initWithData: data];
            if !app_icon.is_null() {
                let _: () = msg_send![ns_app, setApplicationIconImage: app_icon];
                println!("[MacOS] Dock 아이콘이 성공적으로 설정되었습니다.");
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 앱 로그 디렉토리 초기화
            if let Ok(log_dir) = app.path().app_log_dir() {
                services::logger::init(log_dir);
            }
            #[cfg(target_os = "macos")]
            set_dock_icon();
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        // 프로세스 추적을 위한 전역 상태 등록
        .manage(process::AppState::default())
        // 프론트엔드에서 호출 가능한 IPC 커맨드 핸들러 등록
        .invoke_handler(tauri::generate_handler![
            commands::download::download_audio,
            commands::download::fetch_metadata,
            commands::download::cancel_download,
            commands::utils::get_default_download_dir,
            commands::utils::create_mobile_zip,
            commands::utils::get_app_log_path,
            commands::utils::read_app_logs,
            commands::utils::clear_app_logs,
            commands::metadata::read_metadata,
            commands::metadata::write_metadata,
            commands::metadata::list_audio_files
        ])
        // 윈도우 이벤트 훅: 창 닫기(X 버튼) 감지 시 활성 자식 프로세스 클린업
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                services::logger::info("app", "윈도우 닫기 이벤트 감지: 활성 프로세스 정리 중...");
                let state = window.state::<AppState>();
                state.kill_all();
            }
        })
        // 앱 인스턴스 빌드 및 애플리케이션 종료 이벤트 훅 설정
        .build(tauri::generate_context!())
        .expect("Tauri 애플리케이션 빌드 중 오류가 발생했습니다.")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                services::logger::info("app", "애플리케이션 종료: 잔여 프로세스 정리");
                let state = app_handle.state::<AppState>();
                state.kill_all();
            }
        });
}
