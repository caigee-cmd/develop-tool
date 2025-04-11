#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    develop_tool_lib::run().expect("error while running tauri application");
}
