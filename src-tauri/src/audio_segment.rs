use anyhow::{Context, Result};
use std::path::Path;
use std::fs;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::Window;

#[derive(Clone, serde::Serialize)]
pub struct SegmentProgress {
    pub file_name: String,
    pub progress: f64,
    pub completed: bool,
    pub index: usize,
    pub total: usize,
}

pub fn segment_audio(
    input_filename: &str, 
    output_folder: &str, 
    segment_time: i32,
    window: &Window,
    index: usize,
    total: usize
) -> Result<()> {
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

    // Get just the filename for progress reporting
    let file_name = Path::new(input_filename)
        .file_name()
        .and_then(|s| s.to_str())
        .context("Invalid input filename")?
        .to_string();

    // Run ffmpeg command with output capture
    let mut child = Command::new("ffmpeg")
        .args([
            "-i", input_filename,
            "-f", "segment",
            "-segment_time", &segment_time.to_string(),
            "-c", "copy",
            &output_pattern
        ])
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to execute ffmpeg")?;

    let stderr = child.stderr.take().context("Failed to capture stderr")?;
    let reader = BufReader::new(stderr);

    // Emit initial progress
    window.emit(
        "segment-progress",
        SegmentProgress {
            file_name: file_name.clone(),
            progress: 0.0,
            completed: false,
            index,
            total,
        }
    ).context("Failed to emit progress")?;

    // Read ffmpeg output line by line
    for line in reader.lines() {
        let line = line.context("Failed to read line")?;
        if line.contains("Opening") && line.contains("for writing") {
            // A new segment is being written, update progress
            if let Some(segment_num) = line
                .split('\'')
                .nth(1)
                .and_then(|s| s.split("part_").nth(1))
                .and_then(|s| s.split('.').next())
                .and_then(|s| s.parse::<i32>().ok())
            {
                let progress = (segment_num as f64 * segment_time as f64) / 100.0;
                window.emit(
                    "segment-progress",
                    SegmentProgress {
                        file_name: file_name.clone(),
                        progress,
                        completed: false,
                        index,
                        total,
                    }
                ).context("Failed to emit progress")?;
            }
        }
    }

    // Wait for the process to complete
    let status = child.wait().context("Failed to wait for ffmpeg")?;

    if !status.success() {
        return Err(anyhow::anyhow!("ffmpeg command failed"));
    }

    // Emit completion
    window.emit(
        "segment-progress",
        SegmentProgress {
            file_name,
            progress: 100.0,
            completed: true,
            index,
            total,
        }
    ).context("Failed to emit completion")?;

    Ok(())
}
