use anyhow::{Context, Result};
use cstr::cstr;
use rsmpeg::{
    avcodec::{AVCodec, AVCodecContext},
    avformat::{AVFormatContextInput, AVFormatContextOutput},
    avutil::ra,
    ffi,
};
use std::ffi::CString;

fn segment_audio(input_filename: &str, output_template: &str, segment_time: i32) -> Result<()> {
    // Convert input filename to CString
    let input_cstr = CString::new(input_filename)?;
    let output_template_cstr = CString::new(output_template)?;

    // Open input file
    let mut input_ctx = AVFormatContextInput::open(&input_cstr, None, &mut None)
        .context("Failed to open input file")?;

    // Find the first audio stream
    let audio_stream_index = input_ctx
        .streams()
        .iter()
        .position(|stream| stream.codecpar().codec_type().is_audio())
        .context("No audio stream found")?;

    let input_stream = input_ctx.streams()[audio_stream_index];
    let codecpar = input_stream.codecpar();

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
        let packet = match input_ctx.read_packet() {
            Ok(Some(packet)) if packet.stream_index as usize == audio_stream_index => packet,
            Ok(Some(_)) => continue, // Skip non-audio packets
            Ok(None) => break,       // End of file
            Err(e) => return Err(anyhow::anyhow!("Packet read error: {:?}", e)),
        };

        // Check if we need to start a new segment
        if current_output_ctx.is_none()
            || packet.pts * input_stream.time_base.num as i64 / input_stream.time_base.den as i64
                >= segment_time as i64 * (segment_number + 1)
        {
            // Close previous output context if exists
            if let Some(mut ctx) = current_output_ctx.take() {
                ctx.write_trailer()?;
            }

            // Create new output filename
            let output_filename =
                output_template.replace("%04d", &format!("{:04}", segment_number));
            let output_cstr = CString::new(output_filename)?;

            // Create new output context
            let mut output_ctx = AVFormatContextOutput::create(&output_cstr, None)?;

            // Create output stream
            let mut out_stream = output_ctx.new_stream();
            out_stream.set_codecpar(&codecpar.clone());
            out_stream.set_time_base(ra(1, input_stream.time_base.den));

            // Write header
            output_ctx.write_header(&mut None)?;

            current_output_ctx = Some(output_ctx);
            segment_number += 1;
        }

        // Write packet to current output
        if let Some(ctx) = current_output_ctx.as_mut() {
            ctx.interleaved_write_frame(&packet)?;
        }
    }

    // Close final output context
    if let Some(mut ctx) = current_output_ctx.take() {
        ctx.write_trailer()?;
    }

    Ok(())
}
