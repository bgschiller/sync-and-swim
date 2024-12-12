import { useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
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
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(50);
  const [currentGuess, setCurrentGuess] = useState<number>(0);
  const [searchRange, setSearchRange] = useState<{ start: number; end: number }>({ start: 0, end: 100 });

  return (
    <div className="find-place">
      <div className="split-files-columns">
        <div className="column">
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
                const audioFiles = await invoke<AudioFile[]>("list_audio_files", {
                  path,
                });
                setFiles(audioFiles);
                const initialIndex = Math.floor((percentage / 100) * audioFiles.length);
                setCurrentFileIndex(initialIndex);
                setCurrentGuess(percentage);
                setSearchRange({ start: 0, end: 100 });
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
              {files.length > 0 && (
                <div className="playback-section">
                  <div className="current-file">
                    Playing: {files[currentFileIndex].name}
                  </div>
                  <audio 
                    controls 
                    src={convertFileSrc(files[currentFileIndex].path)}
                    style={{ width: '100%', marginBottom: '1rem' }}
                  />
                  <div className="feedback-controls">
                    <p>Does this part sound familiar?</p>
                    <div className="feedback-buttons">
                      <button 
                        onClick={() => {
                          // If they remember this part, search in later files
                          const newStart = currentGuess;
                          const newEnd = searchRange.end;
                          const newGuess = Math.floor((newStart + newEnd) / 2);
                          setSearchRange({ start: newStart, end: newEnd });
                          setCurrentGuess(newGuess);
                          setCurrentFileIndex(Math.floor((newGuess / 100) * files.length));
                        }}
                        className="feedback-btn yes"
                      >
                        Yes, I remember this
                      </button>
                      <button 
                        onClick={() => {
                          // If they don't remember, search in earlier files
                          const newStart = searchRange.start;
                          const newEnd = currentGuess;
                          const newGuess = Math.floor((newStart + newEnd) / 2);
                          setSearchRange({ start: newStart, end: newEnd });
                          setCurrentGuess(newGuess);
                          setCurrentFileIndex(
                            Math.floor((newGuess / 100) * files.length),
                          );
                        }}
                        className="feedback-btn no"
                      >
                        No, don't remember this
                      </button>
                      <button
                        onClick={() => {
                          // If unsure, try the previous file
                          const newIndex = Math.max(0, currentFileIndex - 1);
                          setCurrentFileIndex(newIndex);
                        }}
                        className="feedback-btn unsure"
                      >
                        Not sure
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
