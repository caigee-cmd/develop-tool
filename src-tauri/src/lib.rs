use tauri::{WebviewUrl, WebviewWindowBuilder, Manager, AppHandle};
use tauri::Wry;
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use cocoa::appkit::NSColor; 
#[cfg(target_os = "macos")]
use cocoa::base::{id, nil};
use std::{thread, time::Duration};

pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<AppHandle<Wry>> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![commands::convert_json_to_excel])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
            // 检查窗口是否已存在并尝试关闭
            if let Some(existing_window) = app.get_webview_window("main") {
                if let Err(e) = existing_window.close() {
                    eprintln!("Failed to close existing window: {}", e);
                }
                // 等待一小段时间确保窗口完全关闭
                thread::sleep(Duration::from_millis(100));
            }

            // 使用随机生成的窗口标识符
            let window_label = format!("main_{}", chrono::Utc::now().timestamp_millis());
            
            let win_builder =
                WebviewWindowBuilder::new(app, window_label, WebviewUrl::default())
                    .inner_size(800.0, 600.0)
                    .title("Json Editor")
                    .focused(true);  // 确保窗口获得焦点
            
            // 仅在 macOS 时设置透明标题栏
           
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);
            
            let window = match win_builder.build() {
                Ok(window) => {
                    // 确保窗口在前台显示
                    window.set_focus().unwrap_or_else(|e| eprintln!("Failed to set focus: {}", e));
                    window
                },
                Err(e) => {
                    eprintln!("Failed to create window: {}", e);
                    return Ok(());
                }
            };
        }
            
            // // 仅在 macOS 时设置背景颜色
            // #[cfg(target_os = "macos")]
            // {
            //     match window.ns_window() {
            //         Ok(ns_window) => unsafe {
            //             let ns_window = ns_window as id;
            //             let _: () = msg_send![ns_window, setBackgroundColor: NSColor::clearColor(nil)];
            //         },
            //         Err(e) => eprintln!("Failed to get ns_window: {}", e)
            //     }
            // }

            Ok(())
        })
        .build(tauri::generate_context!())?;

    let handle = app.handle().clone();
    app.run(|_app_handle, _event| {});
    Ok(handle)
}
