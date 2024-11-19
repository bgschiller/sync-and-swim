import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from '@tauri-apps/api/event';

interface AudioFile {
  name: string;
  path: string;
  relative_path: string;  // Path relative to source directory
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
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['']));
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

  function shuffleDirectoryFiles(dirPath: string) {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const dirFiles = newFiles.filter(f => f.relative_path === dirPath);
      const otherFiles = newFiles.filter(f => f.relative_path !== dirPath);
      
      // Shuffle only the files in this directory
      for (let i = dirFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirFiles[i], dirFiles[j]] = [dirFiles[j], dirFiles[i]];
      }
      
      return [...otherFiles, ...dirFiles];
    });
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
        <button onClick={selectDestDir}>Select Destination Folder</button>
      </div>

      {sourceDir && <p>Source: {sourceDir}</p>}
      {destDir && <p>Destination: {destDir}</p>}

      {files.length > 0 && (
        <div className="file-list">
          <h2>Files to Transfer:</h2>
          <ul>
            {Object.entries(files.reduce<DirectoryStructure>((acc, file) => {
              const dir = file.relative_path || '';
              if (!acc[dir]) acc[dir] = [];
              acc[dir].push(file);
              return acc;
            }, {})).map(([dir, dirFiles]) => (
              <li key={dir}>
                {dir ? (
                  <>
                    <div className="directory-header">
                      <div 
                        className="directory-title"
                        onClick={() => setExpandedDirs(prev => {
                          const next = new Set(prev);
                          if (next.has(dir)) {
                            next.delete(dir);
                          } else {
                            next.add(dir);
                          }
                          return next;
                        })}
                      >
                        <span className={`directory-toggle ${expandedDirs.has(dir) ? 'expanded' : ''}`}>
                          ▶
                        </span>
                        {dir}/
                      </div>
                      <button 
                        className="shuffle-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          shuffleDirectoryFiles(dir);
                        }}
                      >
                        🔀 Shuffle
                      </button>
                    </div>
                    {expandedDirs.has(dir) && (
                      <ul className="directory-files">
                        {dirFiles.map((file, index) => (
                          <li key={file.path}>
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  dirFiles.map((file, index) => (
                    <li key={file.path}>
                      {file.name}
                    </li>
                  ))
                )}
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
