import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface AudioFile {
  name: string;
  path: string;
  relative_path: string;
}

function SplitFiles() {
  const [sourceDir, setSourceDir] = useState<string>("");
  const [destDir, setDestDir] = useState<string>("");
  const [files, setFiles] = useState<AudioFile[]>([]);

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
              <li key={index}>{file.name}</li>
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
