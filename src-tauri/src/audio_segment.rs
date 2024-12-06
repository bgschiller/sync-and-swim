use anyhow::{Context, Result};
use rsmpeg::{
    avcodec::{AVCodec, AVCodecContext},
    avformat::{AVFormatContextInput, AVFormatContextOutput},
    avutil::ra,
};
use std::ffi::CString;

use std::path::Path;
use std::fs;

pub fn segment_audio(input_filename: &str, output_folder: &str, segment_time: i32) -> Result<()> {
    // Ensure output directory exists
    fs::create_dir_all(output_folder)?;
    // Open input file
    let mut input_ctx = AVFormatContextInput::open(&CString::new(input_filename.to_string())?, None, &mut None)
        .context("Failed to open input file")?;

    // Find the first audio stream
    let audio_stream_index = input_ctx
        .streams()
        .iter()
        .position(|stream| stream.codecpar().codec_type().is_audio())
        .context("No audio stream found")?;

    let codecpar = input_ctx.streams()[audio_stream_index].codecpar().clone();
    let time_base = input_ctx.streams()[audio_stream_index].time_base;

    // Find decoder
    let decoder = AVCodec::find_decoder(codecpar.codec_id).context("Failed to find decoder")?;

    // Create decoder context
    let mut dec_ctx = AVCodecContext::new(&decoder);
    dec_ctx
        .apply_codecpar(&codecpar)
        .context("Failed to copy decoder parameters")?;
    dec_ctx.open(None)?;

    // Prepare for segmenting
    let mut segment_number = 0;
    let mut current_output_ctx: Option<AVFormatContextOutput> = None;

    // Packet reading loop
    loop {
        let mut packet = match input_ctx.read_packet() {
            Ok(Some(packet)) if packet.stream_index as usize == audio_stream_index => packet,
            Ok(Some(_)) => continue, // Skip non-audio packets
            Ok(None) => break,       // End of file
            Err(e) => return Err(anyhow::anyhow!("Packet read error: {:?}", e)),
        };

        // Check if we need to start a new segment
        if current_output_ctx.is_none()
            || packet.pts * time_base.num as i64 / time_base.den as i64
                >= segment_time as i64 * (segment_number + 1)
        {
            // Close previous output context if exists
            if let Some(mut ctx) = current_output_ctx.take() {
                ctx.write_trailer()?;
            }

            // Get input filename without path and extension
            let input_name = Path::new(input_filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .context("Invalid input filename")?;
            
            // Create new output filename
            let output_filename = format!(
                "{}/{}_part_{:04}.mp3",
                output_folder,
                input_name,
                segment_number
            );
            // Create new output context
            let mut output_ctx = AVFormatContextOutput::create(
                &CString::new(output_filename)?,
                None
            )?;

            {
                // Create output stream in its own scope
                let mut out_stream = output_ctx.new_stream();
                out_stream.set_codecpar(codecpar.clone());
                out_stream.set_time_base(ra(1, time_base.den));
            }

            // Write header after stream is dropped
            output_ctx.write_header(&mut None)?;
            current_output_ctx = Some(output_ctx);
            segment_number += 1;
        }

        // Write packet to current output
        if let Some(ctx) = current_output_ctx.as_mut() {
            ctx.interleaved_write_frame(&mut packet)?;
        }
    }

    // Close final output context
    if let Some(mut ctx) = current_output_ctx.take() {
        ctx.write_trailer()?;
    }

    Ok(())
}
