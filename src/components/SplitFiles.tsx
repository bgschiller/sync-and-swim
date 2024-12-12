import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FileChoice } from "./FileChoice";
import "./SplitFiles.css";

interface AudioFile {
  name: string;
  path: string;
  relative_path: string;
}

function SplitFiles() {
  const [sourceDir, setSourceDir] = useState<string>("");
  const [destDir, setDestDir] = useState<string>("");
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [chunkMinutes, setChunkMinutes] = useState<number>(3);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [currentFile, setCurrentFile] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if ffmpeg is available
    invoke<boolean>("check_ffmpeg")
      .then((available) => setFfmpegAvailable(available))
      .catch(() => setFfmpegAvailable(false));

    const unlisten = listen("segment-progress", (event: any) => {
      const { file_name, progress: fileProgress, completed } = event.payload;
      setCurrentFile(file_name);
      setProgress((prev) => ({
        ...prev,
        [file_name]: completed ? 100 : fileProgress,
      }));
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function handleSplit() {
    if (!destDir) {
      alert("Please select a destination directory");
      return;
    }
    try {
      setIsProcessing(true);
      await invoke("split_audio_files", {
        files,
        destPath: destDir,
        chunkMinutes,
      });
      alert("Files split successfully!");
    } catch (error) {
      alert(`Splitting failed: ${error}`);
    } finally {
      setIsProcessing(false);
      setProgress({});
      setCurrentFile("");
    }
  }

  return (
    <div className="split-files-container">
      <div className="split-files-columns">
        <div className="column">
          {ffmpegAvailable === false && (
            <div className="ffmpeg-missing-warning">
              ⚠️ Warning: ffmpeg is not available on your system. File splitting
              will not work without it. Please install ffmpeg first.
            </div>
          )}
          <p>
            Some audio files might be too long for your headphones to handle
            properly. This tool can split them into smaller chunks of a
            specified duration.
          </p>
          <ol className="controls">
            <li>
              Choose a folder with the long audio files you want to split.
              <FileChoice
                label="Source Folder"
                value={sourceDir}
                onChange={async (path) => {
                  setSourceDir(path);
                  const audioFiles = await invoke<AudioFile[]>(
                    "list_audio_files",
                    {
                      path,
                    },
                  );
                  setFiles(audioFiles);
                }}
              />
            </li>
            <li>
              Choose where to save the split files
              <FileChoice
                label="Destination Folder"
                value={destDir}
                onChange={(path) => setDestDir(path)}
              />
            </li>
            <li>
              Set the maximum length for each chunk
              <div className="chunk-duration">
                <label>
                  Minutes per chunk:
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={chunkMinutes}
                    onChange={(e) =>
                      setChunkMinutes(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                  />
                </label>
              </div>
            </li>
          </ol>
        </div>
        <div className="column">
          <div className="file-list">
            <h2>Files to Split:</h2>
            {files.length > 0 ? (
              <ul>
                {files.map((file) => (
                  <li key={file.path}>
                    {file.name}
                    {currentFile === file.name && (
                      <span className="file-progress">
                        Progress:{" "}
                        <span className="progress-value">
                          {progress[file.name]?.toFixed(1) || 0}%
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No files selected</p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleSplit}
        disabled={!destDir || isProcessing || files.length === 0}
        className="transfer-button"
      >
        {isProcessing ? "Processing..." : "Split Files"}
      </button>
    </div>
  );
}

export default SplitFiles;
