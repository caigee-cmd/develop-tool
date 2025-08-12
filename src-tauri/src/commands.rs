use serde_json::Value;
use xlsxwriter::Workbook;
use tempfile::Builder;
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn convert_json_to_excel(json_data: &str) -> Result<Vec<u8>, String> {
    // 解析JSON
    let json: Value = serde_json::from_str(json_data)
        .map_err(|e| format!("JSON解析错误: {}", e))?;

    // 创建临时文件
    let temp_file = Builder::new()
        .prefix("temp")
        .suffix(".xlsx")
        .tempfile()
        .map_err(|e| format!("创建临时文件失败: {}", e))?;
    let path = temp_file.path().to_str()
        .ok_or("临时文件路径无效")?;

    // 创建Excel工作簿
    let workbook = Workbook::new(path)
        .map_err(|e| format!("创建Excel文件失败: {}", e))?;
    let mut sheet = workbook.add_worksheet(None)
        .map_err(|e| format!("创建工作表失败: {}", e))?;

    // 处理JSON数组
    if let Value::Array(array) = &json {
        if let Some(first_item) = array.first() {
            if let Value::Object(obj) = first_item {
                // 写入表头
                for (col, key) in obj.keys().enumerate() {
                    sheet.write_string(0, col as u16, key, None)
                        .map_err(|e| format!("写入表头失败: {}", e))?;
                }

                // 写入数据
                for (row, item) in array.iter().enumerate() {
                    if let Value::Object(obj) = item {
                        for (col, (_key, value)) in obj.iter().enumerate() {
                            let cell_value = match value {
                                Value::String(s) => s.clone(),
                                Value::Number(n) => n.to_string(),
                                Value::Bool(b) => b.to_string(),
                                Value::Null => "".to_string(),
                                _ => value.to_string(),
                            };
                            sheet.write_string((row + 1) as u32, col as u16, &cell_value, None)
                                .map_err(|e| format!("写入数据失败: {}", e))?;
                        }
                    }
                }
            }
        }
    } else {
        return Err("JSON数据必须是数组格式".to_string());
    }

    // 关闭工作簿
    workbook.close().map_err(|e| format!("保存Excel文件失败: {}", e))?;

    // 读取生成的文件
    let mut file = File::open(path).map_err(|e| format!("读取Excel文件失败: {}", e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| format!("读取Excel文件内容失败: {}", e))?;

    Ok(buffer)
} 

#[tauri::command]
pub fn save_to_cache(app: AppHandle, tab_id: &str, content: &str) -> Result<String, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("获取应用缓存目录失败: {}", e))?;
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("创建缓存目录失败: {}", e))?;

    let mut file_path = PathBuf::from(&cache_dir);
    let sanitized = tab_id.replace('/', "_").replace('\\', "_");
    file_path.push(format!("tab-{}.json", sanitized));

    let mut file = File::create(&file_path)
        .map_err(|e| format!("创建缓存文件失败: {}", e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("写入缓存文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_to_path(path: &str, content: &str) -> Result<(), String> {
    let mut file = File::create(path)
        .map_err(|e| format!("创建文件失败: {}", e))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn set_menu_enabled(app: AppHandle, save_enabled: bool, save_as_enabled: bool) -> Result<(), String> {
    // try update by id; ignore if not found
    if let Some(menu) = app.menu() {
        if let Some(item) = menu.get("file-save") {
            if let Some(mi) = item.as_menuitem() {
                let _ = mi.set_enabled(save_enabled);
            }
        }
        if let Some(item) = menu.get("file-save-as") {
            if let Some(mi) = item.as_menuitem() {
                let _ = mi.set_enabled(save_as_enabled);
            }
        }
    }
    Ok(())
}