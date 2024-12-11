import { useState, useEffect } from "react";
import { FileChoice } from "./FileChoice";
import "./FileTransfer.css";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

interface AudioFile {
  name: string;
  path: string;
  relative_path: string; // Path relative to source directory
}

interface DirectoryStructure {
  [key: string]: AudioFile[];
}

interface CopyProgress {
  file_name: string;
  completed: boolean;
  index: number;
  total: number;
}

function FileTransfer() {
  const [sourceDir, setSourceDir] = useState<string>("");
  const [destDir, setDestDir] = useState<string>("");
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [shuffledDirs, setShuffledDirs] = useState<Set<string>>(new Set());
  const [currentFile, setCurrentFile] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMode, setTransferMode] = useState<"append" | "replace">("append");
  const [existingFileCount, setExistingFileCount] = useState<number>(0);

  useEffect(() => {
    const setupListener = async () => {
      await listen<CopyProgress>("copy-progress", (event) => {
        const { file_name, index, total } = event.payload;
        setCurrentFile(file_name);
        setProgress(Math.round(((index + 1) * 100) / total));
      });
    };

    setupListener();

    return () => {
      listen<CopyProgress>("copy-progress", () => {}).then((unlisten) =>
        unlisten(),
      );
    };
  }, []);

  async function selectSourceDir() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Source Directory",
    });
    if (selected && !Array.isArray(selected)) {
      setSourceDir(selected);
      const audioFiles = await invoke<AudioFile[]>("list_audio_files", {
        path: selected,
      });
      setFiles(audioFiles);
    }
  }

  async function selectDestDir() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Destination Directory",
    });
    if (selected && !Array.isArray(selected)) {
      setDestDir(selected);
    }
  }

  function toggleDirectoryOrder(dirPath: string) {
    setFiles((prevFiles) => {
      // Create a map to maintain directory order
      const filesByDir = prevFiles.reduce<Record<string, AudioFile[]>>(
        (acc, file) => {
          const dir = file.relative_path;
          if (!acc[dir]) acc[dir] = [];
          acc[dir].push(file);
          return acc;
        },
        {},
      );

      if (filesByDir[dirPath]) {
        const dirFiles = filesByDir[dirPath];
        if (shuffledDirs.has(dirPath)) {
          // Sort alphabetically
          dirFiles.sort((a, b) => a.name.localeCompare(b.name));
          setShuffledDirs((prev) => {
            const next = new Set(prev);
            next.delete(dirPath);
            return next;
          });
        } else {
          // Shuffle
          for (let i = dirFiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirFiles[i], dirFiles[j]] = [dirFiles[j], dirFiles[i]];
          }
          setShuffledDirs((prev) => new Set(prev).add(dirPath));
        }
      }

      // Flatten back to array while maintaining directory order
      return Object.values(filesByDir).flat();
    });
  }

  async function handleTransfer() {
    if (!destDir) {
      alert("Please select a destination directory");
      return;
    }
    try {
      setIsTransferring(true);
      await invoke("copy_files", {
        files,
        destPath: destDir,
        mode: transferMode,
      });
      alert("Files transferred successfully!");
    } catch (error) {
      alert(`Transfer failed: ${error}`);
    } finally {
      setIsTransferring(false);
      setProgress(0);
      setCurrentFile("");
    }
  }

  return (
    <div className="file-transfer-container">
      <div className="column">
        <p>
          If you try to copy audio files to Shokz headphones with most tools,
          they'll end up out of order. Instead of sorting by filename, the
          headphones decide which track is next according to when each file was
          copied.
        </p>
        <p>
          This program copies the files one at a time, ensuring each has arrived
          before sending the next.
        </p>
      </div>
      <div className="column">
        <ol className="controls">
          <li>
            Choose a folder on your computer with the audio files you want to
            transfer.
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
            Choose the folder representing your headphones (it's probably named
            something like "/Volumes/OpenSwim")
            <FileChoice
              label="Destination Folder"
              value={destDir}
              onChange={async (path) => {
                setDestDir(path);
                if (path) {
                  const existingFiles = await invoke<AudioFile[]>("deep_list_files", {
                    path,
                  });
                  setExistingFileCount(existingFiles.length);
                } else {
                  setExistingFileCount(0);
                }
              }}
            />
          </li>
          <li>
            Choose whether to
            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  id="append"
                  name="transferMode"
                  value="append"
                  checked={transferMode === "append"}
                  onChange={(e) =>
                    setTransferMode(e.target.value as "append" | "replace")
                  }
                />
                <label htmlFor="append">
                  Add after existing files ({existingFileCount} file{existingFileCount !== 1 ? 's' : ''})
                </label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="replace"
                  name="transferMode"
                  value="replace"
                  checked={transferMode === "replace"}
                  onChange={(e) =>
                    setTransferMode(e.target.value as "append" | "replace")
                  }
                />
                <label htmlFor="replace">
                  Delete existing files first ({existingFileCount} file{existingFileCount !== 1 ? 's' : ''} will be removed)
                </label>
              </div>
            </div>
          </li>
        </ol>

        {isTransferring && (
          <div className="progress">
            <p>Copying: {currentFile}</p>
            <p>Progress: {progress}%</p>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleTransfer}
          disabled={!destDir || isTransferring}
          className="transfer-button"
        >
          {isTransferring ? "Transferring..." : "Transfer Files"}
        </button>
      </div>
      <div className="column">
        <div className="file-list">
          <h2>Files to Transfer:</h2>
          <ul>
            {Object.entries(
              files.reduce<DirectoryStructure>((acc, file) => {
                const dir = file.relative_path || "";
                if (!acc[dir]) acc[dir] = [];
                acc[dir].push(file);
                return acc;
              }, {}),
            ).map(([dir, dirFiles]) => (
              <li key={dir}>
                {dir ? (
                  <>
                    <div className="directory-header">
                      <div
                        className="directory-title"
                        onClick={() =>
                          setExpandedDirs((prev) => {
                            const next = new Set(prev);
                            if (next.has(dir)) {
                              next.delete(dir);
                            } else {
                              next.add(dir);
                            }
                            return next;
                          })
                        }
                      >
                        <span
                          className={`directory-toggle ${expandedDirs.has(dir) ? "expanded" : ""}`}
                        >
                          ▶
                        </span>
                        {dir}/
                      </div>
                      <button
                        className="shuffle-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDirectoryOrder(dir);
                          setExpandedDirs((prev) => new Set(prev).add(dir));
                        }}
                      >
                        {shuffledDirs.has(dir) ? "↕️ Sort" : "🔀 Shuffle"}
                      </button>
                    </div>
                    {expandedDirs.has(dir) && (
                      <ul className="directory-files">
                        {dirFiles.map((file) => (
                          <li key={file.path}>{file.name}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  dirFiles.map((file) => <li key={file.path}>{file.name}</li>)
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default FileTransfer;
