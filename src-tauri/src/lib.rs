use tauri::{Manager, AppHandle};
use tauri::Wry;

pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<AppHandle<Wry>> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![commands::convert_json_to_excel])
        .setup(|_app| Ok(()))
        .build(tauri::generate_context!())?;

    let handle = app.handle().clone();
    app.run(|_app_handle, _event| {});
    Ok(handle)
}
