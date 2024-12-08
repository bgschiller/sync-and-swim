use anyhow::{Context, Result};
use std::path::Path;
use std::fs;
use std::process::Command;

pub fn segment_audio(input_filename: &str, output_folder: &str, segment_time: i32) -> Result<()> {
    // Ensure output directory exists
    fs::create_dir_all(output_folder)?;

    // Get input filename without path and extension
    let input_name = Path::new(input_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .context("Invalid input filename")?;

    // Create output pattern
    let output_pattern = format!(
        "{}/{}_part_%04d.mp3",
        output_folder,
        input_name
    );

    // Run ffmpeg command
    let status = Command::new("ffmpeg")
        .args([
            "-i", input_filename,
            "-f", "segment",
            "-segment_time", &segment_time.to_string(),
            "-c", "copy",
            &output_pattern
        ])
        .status()
        .context("Failed to execute ffmpeg")?;

    if !status.success() {
        return Err(anyhow::anyhow!("ffmpeg command failed"));
    }

    Ok(())
}
