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

/// Finds ffmpeg in common locations and PATH
pub async fn find_ffmpeg<R: Runtime>(shell: &Shell<R>) -> Option<PathBuf> {
    // First check PATH
    if let Ok(path) = shell.command("which").arg("ffmpeg").output().await {
        if path.status.success() {
            if let Ok(path_str) = String::from_utf8(path.stdout) {
                let path = PathBuf::from(path_str.trim());
                if is_executable_ffmpeg(&path) {
                    return Some(path);
                }
            }
        }
    }

    // Then check common locations
    for base_path in COMMON_PATHS {
        let path = PathBuf::from(base_path).join("ffmpeg");
        if is_executable_ffmpeg(&path) {
            return Some(path);
        }
    }

    None
}
