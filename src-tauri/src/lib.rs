use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;
use std::fs::remove_file;
mod audio_segment;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioFile {
    name: String,
    path: String,
    relative_path: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct CopyProgress {
    file_name: String,
    completed: bool,
    index: usize,
    total: usize,
}

fn visit_dirs(dir: &PathBuf, base_path: &PathBuf) -> Result<Vec<AudioFile>, String> {
    let mut files = Vec::new();

    if dir.is_dir() {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_dir() {
                files.extend(visit_dirs(&path, base_path)?);
            } else if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    // Skip .DS_Store files
                    if name == ".DS_Store" {
                        continue;
                    }
                    // Get the relative path by stripping the base path
                    let relative = path
                        .strip_prefix(base_path)
                        .map_err(|e| e.to_string())?
                        .parent()
                        .and_then(|p| p.to_str())
                        .unwrap_or("")
                        .to_string();

                    files.push(AudioFile {
                        name: name.to_string(),
                        path: path.to_string_lossy().to_string(),
                        relative_path: relative,
                    });
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
async fn deep_list_files(path: &str) -> Result<Vec<AudioFile>, String> {
    let base_path = PathBuf::from(path);
    visit_dirs(&base_path, &base_path)
}

#[tauri::command]
async fn shallow_list_files(path: &str) -> Result<Vec<AudioFile>, String> {
    let dir = PathBuf::from(path);
    let mut files = Vec::new();

    if dir.is_dir() {
        for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name == ".DS_Store" {
                        continue;
                    }
                    files.push(AudioFile {
                        name: name.to_string(),
                        path: path.to_string_lossy().to_string(),
                        relative_path: String::new(), // No subdirs for this function
                    });
                }
            }
        }
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
async fn list_audio_files(path: &str) -> Result<Vec<AudioFile>, String> {
    let base_path = PathBuf::from(path);
    let mut files = visit_dirs(&base_path, &base_path)?;
    files.sort_by(|a, b| {
        // First compare by relative path
        let path_cmp = a.relative_path.cmp(&b.relative_path);
        if path_cmp == std::cmp::Ordering::Equal {
            // If paths are equal, compare by name
            a.name.cmp(&b.name)
        } else {
            path_cmp
        }
    });
    Ok(files)
}

#[tauri::command]
async fn delete_files(files: Vec<AudioFile>) -> Result<(), String> {
    for file in files {
        remove_file(&file.path).map_err(|e| format!("Failed to delete {}: {}", file.name, e))?;
    }
    Ok(())
}

#[tauri::command]
async fn check_ffmpeg() -> Result<bool, String> {
    let output = std::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map_err(|_| "Failed to execute ffmpeg command".to_string())?;
    
    Ok(output.status.success())
}

#[tauri::command]
async fn split_audio_files(
    files: Vec<AudioFile>,
    dest_path: &str,
    chunk_minutes: u32,
    window: tauri::Window,
) -> Result<(), String> {
    for (index, file) in files.iter().enumerate() {
        // Emit progress start
        window
            .emit(
                "copy-progress",
                CopyProgress {
                    file_name: file.name.clone(),
                    completed: false,
                    index,
                    total: files.len(),
                },
            )
            .map_err(|e| e.to_string())?;

        // Convert chunk_minutes to seconds for segment_audio
        let segment_time = (chunk_minutes * 60) as i32;

        // Call segment_audio for each file with progress tracking
        audio_segment::segment_audio(
            &file.path,
            dest_path,
            segment_time,
            &window,
            index,
            files.len(),
        )
        .map_err(|e| format!("Failed to split {}: {}", file.name, e))?;

        // Emit progress completion
        window
            .emit(
                "copy-progress",
                CopyProgress {
                    file_name: file.name.clone(),
                    completed: true,
                    index,
                    total: files.len(),
                },
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn copy_files(
    files: Vec<AudioFile>,
    dest_path: &str,
    mode: &str,
    window: tauri::Window,
) -> Result<(), String> {
    // Delete destination directory if mode is "replace"
    if mode == "replace" {
        if let Err(e) = fs::remove_dir_all(dest_path) {
            // Ignore if directory doesn't exist
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(e.to_string());
            }
        }
        fs::create_dir_all(dest_path).map_err(|e| e.to_string())?;
    }

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
        let mut dest_file = PathBuf::from(dest_path);

        // Create subdirectory if relative_path is not empty
        if !file.relative_path.is_empty() {
            dest_file = dest_file.join(&file.relative_path);
            fs::create_dir_all(&dest_file).map_err(|e| e.to_string())?;
        }

        dest_file = dest_file.join(&file.name);
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
        .invoke_handler(tauri::generate_handler![
            list_audio_files,
            copy_files,
            shallow_list_files,
            deep_list_files,
            split_audio_files,
            check_ffmpeg,
            delete_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
