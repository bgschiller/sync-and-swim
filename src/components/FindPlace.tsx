import { useState } from "react";
import { FileChoice } from "./FileChoice";
import "./FindPlace.css";

function FindPlace() {
  const [audioDir, setAudioDir] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [percentage, setPercentage] = useState<number>(0);

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

      {audioDir && (
        <>
          <div className="percentage-input">
            <label htmlFor="percentage">How far through were you? (%)</label>
            <input
              type="number"
              id="percentage"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
            />
          </div>
          <div className="playback-controls">
            <button className="play-btn" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            {/* TODO: Add skip forward/backward controls */}
          </div>
        </>
      )}
    </div>
  );
}

export default FindPlace;
