import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileChoice } from "./FileChoice";
import "./FindPlace.css";

interface AudioFile {
  name: string;
  path: string;
  relative_path: string;
}

interface FindPlaceProps {
  onSelectOption?: (optionId: string) => void;
}

function FindPlace({ onSelectOption }: FindPlaceProps) {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [audioDir, setAudioDir] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [percentage, setPercentage] = useState<number>(50);

  return (
    <div className="find-place">
      <div className="split-files-columns">
        <div className="column">
          <h2>Find Your Place</h2>
          <p>
            Select a directory containing your audiobooks or podcasts. We'll
            skip around to find the last place you remember. This works best if
            your audio files are small, so you may want to{" "}
            <a href="#" onClick={() => onSelectOption?.("split")}>
              split them first
            </a>
            .
          </p>

          <div className="file-selection">
            <FileChoice
              label="Audio Directory"
              value={audioDir}
              onChange={async (path) => {
                setAudioDir(path);
                const audioFiles = await invoke<AudioFile[]>(
                  "list_audio_files",
                  {
                    path,
                  },
                );
                setFiles(audioFiles);
              }}
            />
          </div>

          {audioDir && (
            <>
              <div className="percentage-input">
                <label htmlFor="percentage">
                  How far through would you guess you are, as a percentage?
                  Leave this at 50 if you like, but it may help you avoid
                  spoilers.
                </label>
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
                <button
                  className="play-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                {/* TODO: Add skip forward/backward controls */}
              </div>
            </>
          )}
        </div>
        <div className="column">
          <div className="file-list">
            <h2>Files in Directory:</h2>
            {files.length > 0 ? (
              <ul>
                {files.map((file) => (
                  <li key={file.path}>{file.name}</li>
                ))}
              </ul>
            ) : (
              <p>No audio files selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FindPlace;
