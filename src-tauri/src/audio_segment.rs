use anyhow::{Context, Result};
use regex::Regex;
use std::fs;
use std::path::Path;
use tauri::{Emitter, Manager, Window};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Clone, serde::Serialize)]
pub struct SegmentProgress {
    pub file_name: String,
    pub progress: f64,
    pub completed: bool,
    pub index: usize,
    pub total: usize,
}

async fn silence_points(
    app: &tauri::AppHandle,
    input_filename: &str,
    silence_duration_seconds: f64,
) -> Result<Vec<f64>> {
    // Run ffmpeg command with output capture using shell plugin
    let shell = app.shell();
    let output = shell
        .command("ffmpeg")
        .args([
            "-i",
            input_filename,
            "-af",
            &format!("silencedetect=n=-30dB:d={}", silence_duration_seconds),
            "-f",
            "null",
            "-",
        ])
        .output()
        .await
        .context("Failed to execute ffmpeg")?;

    // Parse ffmpeg output to get split points
    let output =
        String::from_utf8(output.stderr.clone()).context("Failed to parse ffmpeg output")?;
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

fn audio_file_duration(app: &tauri::AppHandle, input_filename: &str) -> Result<f64> {
    let shell = app.shell();
    let output = tauri::async_runtime::block_on(async move {
        shell
            .command("ffprobe")
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
            .await
            .context("Failed to execute ffprobe")
    })?;

    let duration =
        String::from_utf8(output.stdout.clone()).context("Failed to parse ffprobe output")?;
    let duration = duration
        .trim()
        .parse::<f64>()
        .context("Failed to parse duration")?;

    Ok(duration)
}

fn split_at_silences(silences: Vec<f64>, segment_time: i32) -> Vec<f64> {
    let mut split_points: Vec<f64> = Vec::new();
    let mut last_split = 0.0;
    let mut last_split_ix: i64 = -1;
    let mut idx = 0;
    while idx < silences.len() {
        let this_stretch = silences[idx] - last_split;
        if this_stretch > segment_time as f64 {
            if idx as i64 - 1 != last_split_ix {
                last_split_ix = (idx - 1) as i64;
                last_split = silences[last_split_ix as usize];
                split_points.push(last_split);
            } else {
                last_split += segment_time as f64;
                split_points.push(last_split);
            }
        } else {
            idx += 1;
        }
    }
    split_points
}

#[test]
fn test_split_at_silences_splits_early_if_necessary() {
    //                          |            |            |
    let silences = vec![80.0, 90.0, 110.0, 180.0, 200.0, 250.0, 310.0];
    let segment_time = 100;
    let split_points = split_at_silences(silences, segment_time);
    assert_eq!(split_points, vec![90.0, 180.0, 250.0]);
}

#[test]
fn test_split_at_silences_splits_at_segment_time_if_no_silence_for_long_enough() {
    let silences = vec![120.0, 350.0];
    let segment_time = 100;
    let split_points = split_at_silences(silences, segment_time);
    assert_eq!(split_points, vec![100.0, 120.0, 220.0, 320.0]);
}

async fn split_points(
    app: &tauri::AppHandle,
    input_filename: &str,
    segment_time: i32,
    cut_at_silence: bool,
) -> Result<Vec<f64>> {
    if cut_at_silence {
        let silences = silence_points(app, input_filename, 1.0).await?;
        Ok(split_at_silences(silences, segment_time))
    } else {
        let duration = audio_file_duration(app, input_filename)?;

        let num_segments = (duration / segment_time as f64).ceil() as i32;
        let split_points = (1..num_segments)
            .map(|i| i as f64 * segment_time as f64)
            .collect();

        Ok(split_points)
    }
}

pub async fn segment_audio(
    input_filename: &str,
    output_folder: &str,
    segment_time: i32,
    cut_at_silence: bool,
    window: &Window,
    index: usize,
    total: usize,
) -> Result<()> {
    let app = window.app_handle();
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

    let splits = split_points(app, input_filename, segment_time, cut_at_silence).await?;
    let split_counts = splits.len();

    let shell = app.shell();
    let (mut events, _cmd) = shell
        .command("ffmpeg")
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
        .spawn()?;

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

    let win = window.clone();
    let fname = file_name.clone();
    // Process events from the command
    while let Some(event) = events.recv().await {
        match event {
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8(line).expect("line wasn't utf8");
                // Look for the input file line that indicates processing has started
                if line.contains("Input #0") {
                    win.emit(
                        "segment-progress",
                        SegmentProgress {
                            file_name: fname.clone(),
                            progress: 0.0, // Initial progress
                            completed: false,
                            index,
                            total,
                        },
                    )
                    .context("Failed to emit progress")?;
                }
                // The output will look like
                // [segment @ 0x14ae05cb0] Opening 'the-lacuna-smol/long-way-0001.mp3' for writing
                // [segment @ 0x14ae05cb0] Opening 'the-lacuna-smol/long-way-0002.mp3' for writing
                // [segment @ 0x14ae05cb0] Opening 'the-lacuna-smol/long-way-0003.mp3' for writing
                // [segment @ 0x14ae05cb0] opening 'the-lacuna-smol/long-way-0004.mp3' for writing
                // and so on. We expect split_count of these lines.
                // If a line matches, emit progress according to how far into split_count we are
                // Parse segment output lines to track progress
                let re = Regex::new(r"Opening '.*?(\d+)\.mp3' for writing").unwrap();
                if let Some(caps) = re.captures(&line) {
                    if let Some(num_str) = caps.get(1) {
                        if let Ok(segment_num) = num_str.as_str().parse::<usize>() {
                            let progress = (segment_num as f64 / split_counts as f64) * 100.0;
                            win.emit(
                                "segment-progress",
                                SegmentProgress {
                                    file_name: fname.clone(),
                                    progress,
                                    completed: false,
                                    index,
                                    total,
                                },
                            )
                            .context("Failed to emit progress")?;
                        }
                    }
                }
            }
            CommandEvent::Terminated(status) => {
                if !status.code.unwrap_or(-1).eq(&0) {
                    return Err(anyhow::anyhow!("ffmpeg command failed"));
                }
                win.emit(
                    "segment-progress",
                    SegmentProgress {
                        file_name: fname.clone(),
                        progress: 100.0,
                        completed: true,
                        index,
                        total,
                    },
                )
                .context("Failed to emit progress")?;

                break;
            }
            _ => {}
        }
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
