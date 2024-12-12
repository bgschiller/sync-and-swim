import { useState } from "react";
import { FileChoice } from "./FileChoice";
import "./FindPlace.css";

function FindPlace() {
  const [audioDir, setAudioDir] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="find-place">
      <h2>Find Your Place</h2>
      <p>
        Select a directory containing your audiobooks or podcasts to find where you left off.
      </p>

      <div className="file-selection">
        <FileChoice
          label="Audio Directory"
          value={audioDir}
          onChange={setAudioDir}
        />
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
