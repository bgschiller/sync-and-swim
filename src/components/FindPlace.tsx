import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./FindPlace.css";

function FindPlace() {
  const [currentFile, setCurrentFile] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);

  const handleFileSelect = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Audio",
          extensions: ["mp3", "m4a", "wav", "aac"],
        },
      ],
    });

    if (selected && typeof selected === "string") {
      setCurrentFile(selected);
    }
  };

  return (
    <div className="find-place">
      <h2>Find Your Place</h2>
      <p>
        Select an audio file to find where you left off in your audiobook or
        podcast.
      </p>

      <div className="file-selection">
        <button onClick={handleFileSelect} className="select-file-btn">
          Select Audio File
        </button>
        {currentFile && (
          <div className="selected-file">
            <p>Selected: {currentFile.split("/").pop()}</p>
          </div>
        )}
      </div>

      {currentFile && (
        <div className="playback-controls">
          <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          {/* TODO: Add skip forward/backward controls */}
        </div>
      )}
    </div>
  );
}

export default FindPlace;
