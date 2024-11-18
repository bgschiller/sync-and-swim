import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from '@tauri-apps/api/event';

interface AudioFile {
  name: string;
  path: string;
  relative_path: string;  // Path relative to source directory
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
  const [currentFile, setCurrentFile] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<CopyProgress>(
      'copy-progress',
      (event) => {
        const { file_name, index, total } = event.payload;
        setCurrentFile(file_name);
        setProgress(Math.round((index + 1) * 100 / total));
      }
    );
    };
    
    setupListener();
    
    return () => {
      listen<CopyProgress>('copy-progress', () => {})
        .then(unlisten => unlisten());
    };
  }, []);

  async function selectSourceDir() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Source Directory"
    });
    if (selected && !Array.isArray(selected)) {
      setSourceDir(selected);
      const audioFiles = await invoke<AudioFile[]>("list_audio_files", { path: selected });
      setFiles(audioFiles);
    }
  }

  async function selectDestDir() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Destination Directory"
    });
    if (selected && !Array.isArray(selected)) {
      setDestDir(selected);
    }
  }

  function shuffleFiles() {
    const shuffled = [...files];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setFiles(shuffled);
  }

  async function handleTransfer() {
    if (!destDir) {
      alert("Please select a destination directory");
      return;
    }
    try {
      setIsTransferring(true);
      await invoke("copy_files", { files, destPath: destDir });
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
    <div>
      <div className="controls">
        <button onClick={selectSourceDir}>Select Source Folder</button>
        {files.length > 0 && <button onClick={shuffleFiles}>Shuffle Files</button>}
        <button onClick={selectDestDir}>Select Destination Folder</button>
      </div>

      {sourceDir && <p>Source: {sourceDir}</p>}
      {destDir && <p>Destination: {destDir}</p>}

      {files.length > 0 && (
        <div className="file-list">
          <h2>Files to Transfer:</h2>
          <ul>
            {files.map((file, index) => (
              <li key={file.path}>
                {index + 1}. {file.name}
              </li>
            ))}
          </ul>
          <button 
            onClick={handleTransfer}
            disabled={!destDir || isTransferring}
          >
            {isTransferring ? 'Transferring...' : 'Transfer Files'}
          </button>

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
        </div>
      )}
    </div>
  );
}

export default FileTransfer;
