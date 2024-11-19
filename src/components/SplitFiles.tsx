import { useState } from 'react';
import { dialog } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api';

interface AudioFile {
  name: string;
  path: string;
  relative_path: string;
}

function SplitFiles() {
  const [sourceDir, setSourceDir] = useState<string>('');
  const [files, setFiles] = useState<AudioFile[]>([]);

  const handleSelectSource = async () => {
    const selected = await dialog.open({
      directory: true,
      multiple: false,
      title: 'Select Source Directory'
    });
    
    if (selected && typeof selected === 'string') {
      setSourceDir(selected);
      const files = await invoke<AudioFile[]>('list_directory_files', { path: selected });
      setFiles(files);
    }
  };

  return (
    <div className="split-files">
      <h2>Split Long Files</h2>
      
      <div className="directory-selection">
        <button onClick={handleSelectSource}>
          Select Source Directory
        </button>
        {sourceDir && <p>Selected: {sourceDir}</p>}
      </div>

      <div className="file-list">
        {files.length > 0 ? (
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No files selected</p>
        )}
      </div>
    </div>
  );
}

export default SplitFiles;
