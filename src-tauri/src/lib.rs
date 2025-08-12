use tauri::{AppHandle, Manager};
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
            let quit = MenuItemBuilder::with_id("app-quit", "退出")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;
            let file = SubmenuBuilder::new(app, "File")
                .items(&[&save, &save_as, &quit])
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

            // Edit menu (common actions)
            let undo = MenuItemBuilder::with_id("edit-undo", "撤销")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let redo = MenuItemBuilder::with_id("edit-redo", "重做")
                .accelerator("Shift+CmdOrCtrl+Z")
                .build(app)?;
            let cut = MenuItemBuilder::with_id("edit-cut", "剪切")
                .accelerator("CmdOrCtrl+X")
                .build(app)?;
            let copy = MenuItemBuilder::with_id("edit-copy", "复制")
                .accelerator("CmdOrCtrl+C")
                .build(app)?;
            let paste = MenuItemBuilder::with_id("edit-paste", "粘贴")
                .accelerator("CmdOrCtrl+V")
                .build(app)?;
            let select_all = MenuItemBuilder::with_id("edit-select-all", "全选")
                .accelerator("CmdOrCtrl+A")
                .build(app)?;
            let edit = SubmenuBuilder::new(app, "Edit")
                .items(&[&undo, &redo, &cut, &copy, &paste, &select_all])
                .build()?;

            // Window menu
            let minimize = MenuItemBuilder::with_id("window-minimize", "最小化")
                .accelerator("CmdOrCtrl+M")
                .build(app)?;
            let fullscreen = MenuItemBuilder::with_id("window-fullscreen", "全屏")
                .accelerator("Ctrl+Cmd+F")
                .build(app)?;
            let window_menu = SubmenuBuilder::new(app, "Window")
                .items(&[&minimize, &fullscreen])
                .build()?;
            let menu = MenuBuilder::new(app)
                .items(&[&file, &edit, &tools, &window_menu])
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
                    "app-quit" => {
                        app.exit(0);
                    }
                    // forward edit actions to frontend to handle
                    "edit-undo" => { let _ = app.emit("edit:undo", ()); }
                    "edit-redo" => { let _ = app.emit("edit:redo", ()); }
                    "edit-cut" => { let _ = app.emit("edit:cut", ()); }
                    "edit-copy" => { let _ = app.emit("edit:copy", ()); }
                    "edit-paste" => { let _ = app.emit("edit:paste", ()); }
                    "edit-select-all" => { let _ = app.emit("edit:select-all", ()); }
                    // window controls
                    "window-minimize" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.minimize();
                        }
                    }
                    "window-fullscreen" => {
                        if let Some(w) = app.get_webview_window("main") {
                            match w.is_fullscreen() {
                                Ok(true) => { let _ = w.set_fullscreen(false); }
                                _ => { let _ = w.set_fullscreen(true); }
                            }
                        }
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
