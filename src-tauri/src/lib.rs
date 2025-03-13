use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder, Manager, AppHandle};
use tauri::Wry;
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};
use cocoa::appkit::NSColor;
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
            // 检查窗口是否已存在并尝试关闭
            if let Some(existing_window) = app.get_webview_window("main") {
                if let Err(e) = existing_window.close() {
                    eprintln!("Failed to close existing window: {}", e);
                }
                // 等待一小段时间确保窗口完全关闭
                thread::sleep(Duration::from_millis(100));
            }

            // 创建主窗口
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .inner_size(800.0, 600.0)
                .title("开发工具集")
                .focused(true)
                .title_bar_style(TitleBarStyle::Transparent)
                .build()?;

            // 仅在 macOS 时设置背景颜色
            #[cfg(target_os = "macos")]
            {
                if let Ok(ns_window) = window.ns_window() {
                    unsafe {
                        let ns_window = ns_window as id;
                        let _: () = msg_send![ns_window, setBackgroundColor: NSColor::clearColor(nil)];
                    }
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())?;

    let handle = app.handle().clone();
    app.run(|_app_handle, _event| {});
    Ok(handle)
}
