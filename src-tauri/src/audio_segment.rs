use anyhow::{Context, Result};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use tauri::{Emitter, Window};

#[derive(Clone, serde::Serialize)]
pub struct SegmentProgress {
    pub file_name: String,
    pub progress: f64,
    pub completed: bool,
    pub index: usize,
    pub total: usize,
}

fn silence_points(input_filename: &str, silence_duration_seconds: f64) -> Result<Vec<f64>> {
    // Run ffmpeg command with output capture
    let output = Command::new("ffmpeg")
        .args([
            "-i",
            input_filename,
            "-af",
            &format!("silencedetect=n=-30dB:d={}", silence_duration_seconds),
            "-f",
            "null",
            "-",
        ])
        .stderr(Stdio::piped())
        .output()
        .context("Failed to execute ffmpeg")?;

    // Parse ffmpeg output to get split points
    let output = String::from_utf8(output.stderr).context("Failed to parse ffmpeg output")?;
    let mut silences = Vec::new();
    for line in output.lines() {
        if let Some(start) = line.find("silence_start:") {
            let start = line[start + 14..].trim();
            let start = start
                .parse::<f64>()
                .context("Failed to parse split point")?;
            silences.push(start);
        }
    }

    Ok(silences)
}

fn audio_file_duration(input_filename: &str) -> Result<f64> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            input_filename,
        ])
        .output()
        .context("Failed to execute ffprobe")?;

    let duration = String::from_utf8(output.stdout).context("Failed to parse ffprobe output")?;
    let duration = duration
        .trim()
        .parse::<f64>()
        .context("Failed to parse duration")?;

    Ok(duration)
}

fn split_points(input_filename: &str, segment_time: i32, cut_at_silence: bool) -> Result<Vec<f64>> {
    if cut_at_silence {
        let silences = silence_points(input_filename, 1.0)?;
        let mut split_points: Vec<f64> = Vec::new();
        let mut last_split = 0.0;
        for silence in silences {
            let potential_chunk_size = silence - last_split;
            if potential_chunk_size > segment_time as f64 {
                let num_segments = (potential_chunk_size / segment_time as f64).floor() as i32;
                for i in 1..num_segments {
                    split_points.push(last_split + i as f64 * segment_time as f64);
                }
                split_points.push(silence);
                last_split = silence;
            }
        }
        Ok(split_points)
    } else {
        let duration = audio_file_duration(input_filename)?;

        let num_segments = (duration / segment_time as f64).ceil() as i32;
        let split_points = (1..num_segments)
            .map(|i| i as f64 * segment_time as f64)
            .collect();

        Ok(split_points)
    }
}

pub fn segment_audio(
    input_filename: &str,
    output_folder: &str,
    segment_time: i32,
    cut_at_silence: bool,
    window: &Window,
    index: usize,
    total: usize,
) -> Result<()> {
    // Ensure output directory exists
    fs::create_dir_all(output_folder)?;

    // Get input filename without path and extension
    let input_name = Path::new(input_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .context("Invalid input filename")?;

    // Create output pattern
    let output_pattern = format!("{}/{}_part_%04d.mp3", output_folder, input_name);

    // Get just the filename for progress reporting
    let file_name = Path::new(input_filename)
        .file_name()
        .and_then(|s| s.to_str())
        .context("Invalid input filename")?
        .to_string();

    let splits = split_points(input_filename, segment_time, cut_at_silence)?;

    // Run ffmpeg command with output capture
    let mut child = Command::new("ffmpeg")
        .args([
            "-i",
            input_filename,
            "-f",
            "segment",
            "-segment_times",
            &splits
                .iter()
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
                .join(","),
            "-c",
            "copy",
            &output_pattern,
        ])
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to execute ffmpeg")?;

    let stderr = child.stderr.take().context("Failed to capture stderr")?;
    let reader = BufReader::new(stderr);

    // Emit initial progress
    window
        .emit(
            "segment-progress",
            SegmentProgress {
                file_name: file_name.clone(),
                progress: 0.0,
                completed: false,
                index,
                total,
            },
        )
        .context("Failed to emit progress")?;

    // Read ffmpeg output line by line looking for the input file line
    let mut started = false;
    for line in reader.lines() {
        let line = line.context("Failed to read line")?;

        // Look for the input file line that indicates processing has started
        if line.contains("Input #0") {
            started = true;
            window
                .emit(
                    "segment-progress",
                    SegmentProgress {
                        file_name: file_name.clone(),
                        progress: 10.0, // Initial progress
                        completed: false,
                        index,
                        total,
                    },
                )
                .context("Failed to emit progress")?;
        }

        // Once we've started, periodically update progress
        if started {
            window
                .emit(
                    "segment-progress",
                    SegmentProgress {
                        file_name: file_name.clone(),
                        progress: 50.0, // Mid-progress
                        completed: false,
                        index,
                        total,
                    },
                )
                .context("Failed to emit progress")?;
        }
    }

    // Wait for the process to complete
    let status = child.wait().context("Failed to wait for ffmpeg")?;

    if !status.success() {
        return Err(anyhow::anyhow!("ffmpeg command failed"));
    }

    // Emit completion
    window
        .emit(
            "segment-progress",
            SegmentProgress {
                file_name,
                progress: 100.0,
                completed: true,
                index,
                total,
            },
        )
        .context("Failed to emit completion")?;

    Ok(())
}
