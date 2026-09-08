# Sync + Swim Changelog

## Unreleased

- Fix "Delete existing files first" failing with "Operation not permitted" on removable volumes. It now deletes only the existing audio files (matching the "N files will be removed" count) instead of removing the whole directory, which could not always delete macOS metadata such as .DS_Store, .Spotlight-V100, .fseventsd, and .Trashes.
- Skip hidden files and directories (such as .Spotlight-V100, .fseventsd, and .Trashes) when listing audio files. These root-owned system directories are unreadable, which previously made the destination file count report "0 files will be removed" even when the volume held many audio files.
- Fix splitting audio files that are shorter than one chunk (they previously failed with an ffmpeg "Empty time specification in times list" error)
- Only list audio files, skipping non-audio files such as Libby's manifest.json

## 0.0.5

- Surface FFmpeg stderr output in error messages instead of generic 'command failed'
- Log all FFmpeg commands and output to the app log file
- Prefix errors with step name (silence detection / duration check / audio segmenting)
- Add winget/Gyan.FFmpeg install paths to Windows search

## 0.0.4

- Better support for finding ffmpeg on Windows
- Keep content from flowing under the scrollable list of files (see [#2](https://github.com/bgschiller/sync-and-swim/issues/2))
  Thanks to [Kieran McWilliams](https://github.com/Maxmaxs5) for these fixes!

## 0.0.3

- Added support for finding ffmpeg in common locations

## 0.0.2

- Added support for dark mode
- Added version number to the 'About' page
- Fix a bug when running Find Your Place for the first time.

## 0.0.1

- Initial Release
