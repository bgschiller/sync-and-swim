use log::{error, info};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::fs::remove_file;
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_shell::ShellExt;
mod audio_segment;
mod find_ffmpeg;

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

fn is_audio_file(name: &str) -> bool {
    const AUDIO_EXTENSIONS: &[&str] = &[
        "mp3", "m4a", "m4b", "aac", "wav", "wma", "flac", "ogg", "opus", "aiff", "aif",
    ];
    match name.rsplit('.').next() {
        Some(ext) => AUDIO_EXTENSIONS.iter().any(|e| e.eq_ignore_ascii_case(ext)),
        None => false,
    }
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.')
}

#[cfg(test)]
mod tests {
    use super::is_audio_file;
    use super::is_hidden;
    use super::visit_dirs;
    use std::fs;

    #[test]
    fn detects_audio_files_case_insensitively() {
        assert!(is_audio_file("book.mp3"));
        assert!(is_audio_file("book.MP3"));
        assert!(is_audio_file("book.m4b"));
        assert!(is_audio_file("track.flac"));
    }

    #[test]
    fn rejects_non_audio_files() {
        assert!(!is_audio_file("book-manifest.json"));
        assert!(!is_audio_file(".DS_Store"));
        assert!(!is_audio_file("cover.jpg"));
        assert!(!is_audio_file("README"));
    }

    #[test]
    fn treats_dotfiles_as_hidden() {
        assert!(is_hidden(".DS_Store"));
        assert!(is_hidden(".Spotlight-V100"));
        assert!(!is_hidden("book.mp3"));
    }

    #[test]
    fn visit_dirs_lists_only_audio_files_and_skips_hidden_entries() {
        let base = std::env::temp_dir().join(format!(
            "sync_and_swim_test_{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(base.join("sub")).unwrap();
        fs::create_dir_all(base.join(".Spotlight-V100")).unwrap();

        fs::write(base.join("book.mp3"), b"x").unwrap();
        fs::write(base.join("cover.jpg"), b"x").unwrap();
        fs::write(base.join(".DS_Store"), b"x").unwrap();
        fs::write(base.join("sub").join("chapter.m4b"), b"x").unwrap();
        fs::write(base.join(".Spotlight-V100").join("store.db"), b"x").unwrap();

        let result = visit_dirs(&base, &base).unwrap();
        let mut names: Vec<String> = result.iter().map(|f| f.name.clone()).collect();
        names.sort();

        assert_eq!(names, vec!["book.mp3".to_string(), "chapter.m4b".to_string()]);

        let _ = fs::remove_dir_all(&base);
    }
}

fn visit_dirs(dir: &PathBuf, base_path: &PathBuf) -> Result<Vec<AudioFile>, String> {
    let mut files = Vec::new();

    if dir.is_dir() {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            // Skip macOS system files/directories and other hidden entries
            // (.DS_Store, .Spotlight-V100, .Trashes, .fseventsd, ...). Some of
            // these are root-owned and unreadable, which would otherwise make
            // the whole listing fail with "Permission denied".
            if let Some(name) = entry.file_name().to_str() {
                if is_hidden(name) {
                    continue;
                }
            }

            if path.is_dir() {
                files.extend(visit_dirs(&path, base_path)?);
            } else if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    // Skip non-audio files (e.g. Libby manifest.json)
                    if !is_audio_file(name) {
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
                    if is_hidden(name) {
                        continue;
                    }
                    // Skip non-audio files (e.g. Libby manifest.json)
                    if !is_audio_file(name) {
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
async fn check_ffmpeg(app: tauri::AppHandle) -> Result<bool, String> {
    let shell = app.shell();

    // Log the PATH environment variable
    if let Ok(path) = env::var("PATH") {
        info!("Current PATH: {}", path);
    } else {
        error!("PATH environment variable not found");
    }

    match find_ffmpeg::find_ffmpeg(shell).await {
        Some(path) => {
            info!("Found ffmpeg at: {}", path.display());
            Ok(true)
        }
        None => {
            error!("FFmpeg not found in PATH or common locations");
            Ok(false)
        }
    }
}

#[tauri::command]
async fn split_audio_files(
    files: Vec<AudioFile>,
    dest_path: &str,
    chunk_minutes: u32,
    cut_at_silence: bool,
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
            cut_at_silence,
            &window,
            index,
            files.len(),
        )
        .await
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
    let dest_dir = PathBuf::from(dest_path);

    // Delete existing audio files if mode is "replace"
    if mode == "replace" {
        // Only remove the audio files we already report in the UI's "N files
        // will be removed" count, rather than nuking the whole directory.
        // remove_dir_all fails with "Operation not permitted" on removable
        // volumes (e.g. Shokz headphones) because macOS creates protected
        // metadata like .DS_Store, .Spotlight-V100, .fseventsd, and .Trashes
        // inside them, which can't always be removed.
        if dest_dir.exists() {
            let existing = visit_dirs(&dest_dir, &dest_dir)?;
            for file in existing {
                remove_file(&file.path)
                    .map_err(|e| format!("Failed to delete {}: {}", file.name, e))?;
            }
        }
    }

    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

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
        let mut dest_file = dest_dir.clone();

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
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .build(),
        )
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
