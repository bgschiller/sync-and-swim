use std::path::{Path, PathBuf};
use std::process::Command;

use tauri::Runtime;
use tauri_plugin_shell::Shell;

/// Common locations where ffmpeg might be installed
const COMMON_PATHS: &[&str] = &[
    "/usr/local/bin",
    "/usr/bin",
    "/opt/homebrew/bin",                       // Homebrew on Apple Silicon
    "/usr/local/opt/ffmpeg/bin",               // Homebrew Intel
    "/opt/homebrew/opt/ffmpeg/bin",            // Homebrew Apple Silicon
    "/Applications/ffmpeg.app/Contents/MacOS", // macOS app bundle
    "C:\\ffmpeg\\bin",                         // Windows location sometimes suggested
    "C:\\Program Files\\ffmpeg\\bin",          // Windows (winget / Gyan.FFmpeg)
    "C:\\Program Files (x86)\\ffmpeg\\bin",    // Windows 32-bit ffmpeg
];

/// Checks if a path points to an executable ffmpeg
fn is_executable_ffmpeg(path: &Path) -> bool {
    if !path.exists() || !path.is_file() {
        return false;
    }

    // On Unix-like systems, check if the file is executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(path) {
            if !metadata.permissions().mode() & 0o111 != 0 {
                return false;
            }
        }
    }

    // Try to run ffmpeg -version to verify it's actually ffmpeg
    Command::new(path)
        .arg("-version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Finds ffmpeg in system PATH and common locations across Windows and Mac/Linux
pub async fn find_ffmpeg<R: Runtime>(shell: &Shell<R>) -> Option<PathBuf> {
    // First check system PATH
    let search_cmd = if cfg!(windows) { "where.exe" } else { "which" };
    if let Ok(path) = shell.command(search_cmd).arg("ffmpeg").output().await {
        if path.status.success() {
            if let Ok(path_str) = String::from_utf8(path.stdout) {
                let final_path_str = if cfg!(windows) {
                    // Windows where.exe can return multiple options, just use the first
                    path_str.lines().next().unwrap_or("").trim()
                } else {
                    path_str.trim()
                };
                let path = PathBuf::from(final_path_str);
                if is_executable_ffmpeg(&path) {
                    return Some(path);
                }
            }
        }
    }

    // Then check hardcoded common locations
    let binary_name = if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" };
    for base_path in COMMON_PATHS {
        let path = PathBuf::from(base_path).join(binary_name);
        if is_executable_ffmpeg(&path) {
            return Some(path);
        }
    }

    None
}
