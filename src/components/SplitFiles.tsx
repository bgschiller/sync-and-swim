import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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
  const [progress, setProgress] = useState<{[key: string]: number}>({});
  const [currentFile, setCurrentFile] = useState<string>("");

  useEffect(() => {
    const unlisten = listen("segment-progress", (event: any) => {
      const { file_name, progress: fileProgress, completed } = event.payload;
      setCurrentFile(file_name);
      setProgress(prev => ({
        ...prev,
        [file_name]: completed ? 100 : fileProgress
      }));
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleSelectSource = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Source Directory",
    });

    if (selected && typeof selected === "string") {
      setSourceDir(selected);
      const files = await invoke<AudioFile[]>("list_directory_files", {
        path: selected,
      });
      setFiles(files);
    }
  };

  return (
    <div className="split-files">
      <h2>Split Long Files</h2>

      <div className="directory-selection">
        <div>
          <button onClick={handleSelectSource}>Select Source Directory</button>
          {sourceDir && <p>Source: {sourceDir}</p>}
        </div>
        <div className="chunk-duration">
          <label>
            Chunk Duration (minutes):
            <input
              type="number"
              min="1"
              step="1"
              value={chunkMinutes}
              onChange={(e) => setChunkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </label>
        </div>
        <div>
          <button onClick={async () => {
            const selected = await open({
              directory: true,
              multiple: false,
              title: "Select Destination Directory",
            });
            if (selected && typeof selected === "string") {
              setDestDir(selected);
            }
          }}>Select Destination Directory</button>
          {destDir && <p>Destination: {destDir}</p>}
        </div>
      </div>

      <div className="file-list">
        {files.length > 0 ? (
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file.name}
                {currentFile === file.name && (
                  <div className="progress">
                    Progress: {progress[file.name]?.toFixed(1) || 0}%
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No files selected</p>
        )}
      </div>

      {sourceDir && destDir && files.length > 0 && (
        <div className="split-actions">
          <button
            onClick={async () => {
              try {
                await invoke("split_audio_files", {
                  files,
                  destPath: destDir,
                  chunkMinutes,
                });
              } catch (error) {
                console.error("Failed to split files:", error);
              }
            }}
          >
            Split Files
          </button>
        </div>
      )}
    </div>
  );
}

export default SplitFiles;
