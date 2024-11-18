use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioFile {
    name: String,
    path: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct CopyProgress {
    file_name: String,
    completed: bool,
    index: usize,
    total: usize,
}

#[tauri::command]
async fn list_audio_files(path: &str) -> Result<Vec<AudioFile>, String> {
    let dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for entry in dir {
        if let Ok(entry) = entry {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Ok(name) = entry.file_name().into_string() {
                        // TODO: Add proper audio file extension filtering
                        files.push(AudioFile {
                            name,
                            path: entry.path().to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
async fn copy_files(
    files: Vec<AudioFile>,
    dest_path: &str,
    window: tauri::Window,
) -> Result<(), String> {
    let total = files.len();

    for (index, file) in files.into_iter().enumerate() {
        // Emit progress start
        window
            .emit(
                "copy-progress",
                CopyProgress {
                    file_name: file.name.clone(),
                    completed: false,
                    index,
                    total,
                },
            )
            .map_err(|e| e.to_string())?;

        // Perform the blocking copy
        let src_path = PathBuf::from(&file.path);
        let file_name = src_path.file_name().ok_or("Invalid file name")?;
        let dest_file = PathBuf::from(dest_path).join(file_name);

        fs::copy(&src_path, &dest_file)
            .map_err(|e| format!("Failed to copy {}: {}", file.name, e))?;

        // Small delay to ensure files have distinct timestamps
        std::thread::sleep(std::time::Duration::from_millis(100));

        // Emit progress completion
        window
            .emit(
                "copy-progress",
                CopyProgress {
                    file_name: file.name,
                    completed: true,
                    index,
                    total,
                },
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![list_audio_files, copy_files,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
