use tauri::{AppHandle};
use tauri::Emitter;
use tauri::menu::{MenuBuilder, SubmenuBuilder, MenuItemBuilder};
use tauri::Wry;

pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<AppHandle<Wry>> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::convert_json_to_excel,
            commands::save_to_cache,
            commands::save_to_path,
            commands::set_menu_enabled,
        ])
        .setup(|app| {
            // Build native menu: File -> Save / Save As
            let save = MenuItemBuilder::with_id("file-save", "保存")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;
            let save_as = MenuItemBuilder::with_id("file-save-as", "另存为…")
                .accelerator("Shift+CmdOrCtrl+S")
                .build(app)?;
            let file = SubmenuBuilder::new(app, "File")
                .items(&[&save, &save_as])
                .build()?;
            // Tools menu
            let extract = MenuItemBuilder::with_id("tools-extract", "字段提取…")
                .accelerator("Shift+CmdOrCtrl+F")
                .build(app)?;
            let to_excel = MenuItemBuilder::with_id("tools-json-to-excel", "JSON 转 Excel…")
                .accelerator("CmdOrCtrl+E")
                .build(app)?;
            let tools = SubmenuBuilder::new(app, "Tools")
                .items(&[&extract, &to_excel])
                .build()?;
            let menu = MenuBuilder::new(app)
                .items(&[&file, &tools])
                .build()?;
            app.set_menu(menu)?;

            // Forward menu events to frontend
            app.on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "file-save" => {
                        let _ = app.emit("menu:save", ());
                    }
                    "file-save-as" => {
                        let _ = app.emit("menu:save-as", ());
                    }
                    "tools-extract" => {
                        let _ = app.emit("tools:extract", ());
                    }
                    "tools-json-to-excel" => {
                        let _ = app.emit("tools:json-to-excel", ());
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())?;

    let handle = app.handle().clone();
    app.run(|_app_handle, _event| {});
    Ok(handle)
}
