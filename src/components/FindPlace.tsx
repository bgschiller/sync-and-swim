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

interface AudioBinarySearchProps {
  files: AudioFile[];
  percentage: number;
  onStartOver: () => void;
}

function AudioBinarySearch({ files, percentage, onStartOver }: AudioBinarySearchProps) {
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(() => 
    Math.floor((percentage / 100) * files.length)
  );
  const [currentGuess, setCurrentGuess] = useState<number>(percentage);
  const [searchRange, setSearchRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 100 });

  return (
    <div className="playback-section">
      <div className="current-file">
        Playing: {files[currentFileIndex].name}
      </div>
      <audio
        controls
        key={files[currentFileIndex].path}
        src={convertFileSrc(files[currentFileIndex].path)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <div className="feedback-controls">
        <p>
          Does this part sound familiar?{" "}
          <span className="steps-remaining">
            Approximately{" "}
            {Math.ceil(Math.log2(searchRange.end - searchRange.start))}{" "}
            more steps needed
          </span>
        </p>
        <div className="feedback-buttons">
          <button
            onClick={() => {
              const newStart = currentGuess;
              const newEnd = searchRange.end;
              const newGuess = Math.floor((newStart + newEnd) / 2);
              setSearchRange({ start: newStart, end: newEnd });
              setCurrentGuess(newGuess);

              const startFileIndex = Math.floor((newStart / 100) * files.length);
              const endFileIndex = Math.floor((newEnd / 100) * files.length);
              const guessFileIndex = Math.floor((newGuess / 100) * files.length);

              if (endFileIndex - startFileIndex === 1 && currentFileIndex === startFileIndex) {
                setCurrentFileIndex(endFileIndex);
              } else if (endFileIndex - startFileIndex <= 1) {
                setCurrentFileIndex(startFileIndex);
              } else if (guessFileIndex === currentFileIndex) {
                setCurrentFileIndex(Math.min(currentFileIndex + 1, endFileIndex));
              } else {
                setCurrentFileIndex(guessFileIndex);
              }
            }}
            className="feedback-btn yes"
          >
            Yes, I remember this
          </button>
          <button
            onClick={() => {
              const newStart = searchRange.start;
              const newEnd = currentGuess;
              const newGuess = Math.floor((newStart + newEnd) / 2);
              setSearchRange({ start: newStart, end: newEnd });
              setCurrentGuess(newGuess);

              const startFileIndex = Math.floor((newStart / 100) * files.length);
              const endFileIndex = Math.floor((newEnd / 100) * files.length);
              const guessFileIndex = Math.floor((newGuess / 100) * files.length);

              if (endFileIndex - startFileIndex <= 1) {
                setCurrentFileIndex(startFileIndex);
              } else if (guessFileIndex === currentFileIndex) {
                setCurrentFileIndex(Math.max(currentFileIndex - 1, startFileIndex));
              } else {
                setCurrentFileIndex(guessFileIndex);
              }
            }}
            className="feedback-btn no"
          >
            No, don't remember this
          </button>
          <button
            onClick={() => {
              const newIndex = Math.max(0, currentFileIndex - 1);
              setCurrentFileIndex(newIndex);
            }}
            className="feedback-btn unsure"
          >
            Not sure
          </button>
        </div>
        <button
          onClick={onStartOver}
          className="feedback-btn start-over"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

function FindPlace({ onSelectOption }: FindPlaceProps) {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [audioDir, setAudioDir] = useState<string>("");
  const [percentage, setPercentage] = useState<number>(50);
  const [isSearching, setIsSearching] = useState<boolean>(false);

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
                const audioFiles = await invoke<AudioFile[]>(
                  "list_audio_files",
                  {
                    path,
                  },
                );
                setFiles(audioFiles);
                const initialIndex = Math.floor(
                  (percentage / 100) * audioFiles.length,
                );
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
                  <input
                    type="number"
                    id="percentage"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                  />
                </label>
              </div>
              {files.length > 0 && (
                <div className="playback-section">
                  <div className="current-file">
                    Playing: {files[currentFileIndex].name}
                  </div>
                  <audio
                    controls
                    autoPlay
                    key={files[currentFileIndex].path} // Force recreation when source changes
                    src={
                      currentFileIndex &&
                      convertFileSrc(files[currentFileIndex].path)
                    }
                    style={{ width: "100%", marginBottom: "1rem" }}
                  />
                  <div className="feedback-controls">
                    <p>
                      Does this part sound familiar?{" "}
                      <span className="steps-remaining">
                        Approximately{" "}
                        {Math.ceil(
                          Math.log2(searchRange.end - searchRange.start),
                        )}{" "}
                        more steps needed
                      </span>
                    </p>
                    <div className="feedback-buttons">
                      <button
                        onClick={() => {
                          // If they remember this part, search in later files
                          const newStart = currentGuess;
                          const newEnd = searchRange.end;
                          const newGuess = Math.floor((newStart + newEnd) / 2);
                          setSearchRange({ start: newStart, end: newEnd });
                          setCurrentGuess(newGuess);

                          // Calculate the range of files in the new search space
                          const startFileIndex = Math.floor(
                            (newStart / 100) * files.length,
                          );
                          const endFileIndex = Math.floor(
                            (newEnd / 100) * files.length,
                          );
                          const guessFileIndex = Math.floor(
                            (newGuess / 100) * files.length,
                          );

                          // If we're down to two files and user recognizes the first one,
                          // play the second file since that's likely where they left off
                          if (
                            endFileIndex - startFileIndex === 1 &&
                            currentFileIndex === startFileIndex
                          ) {
                            setCurrentFileIndex(endFileIndex);
                          } else if (endFileIndex - startFileIndex <= 1) {
                            setCurrentFileIndex(startFileIndex);
                          } else if (guessFileIndex === currentFileIndex) {
                            // If the new guess would play the same file, force moving forward
                            setCurrentFileIndex(
                              Math.min(currentFileIndex + 1, endFileIndex),
                            );
                          } else {
                            setCurrentFileIndex(guessFileIndex);
                          }
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

                          // Calculate the range of files in the new search space
                          const startFileIndex = Math.floor(
                            (newStart / 100) * files.length,
                          );
                          const endFileIndex = Math.floor(
                            (newEnd / 100) * files.length,
                          );
                          const guessFileIndex = Math.floor(
                            (newGuess / 100) * files.length,
                          );

                          // If we're down to two or fewer files, always play the first file in range
                          if (endFileIndex - startFileIndex <= 1) {
                            setCurrentFileIndex(startFileIndex);
                          } else if (guessFileIndex === currentFileIndex) {
                            // If the new guess would play the same file, force moving backward
                            setCurrentFileIndex(
                              Math.max(currentFileIndex - 1, startFileIndex),
                            );
                          } else {
                            setCurrentFileIndex(guessFileIndex);
                          }
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
                    <button
                      onClick={() => {
                        // Reset to initial state
                        const initialIndex = Math.floor(
                          (percentage / 100) * files.length,
                        );
                        setCurrentFileIndex(initialIndex);
                        setCurrentGuess(percentage);
                        setSearchRange({ start: 0, end: 100 });
                      }}
                      className="feedback-btn start-over"
                    >
                      Start Over
                    </button>
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
                {files.map((file, index) => {
                  const filePercentage = (index / files.length) * 100;
                  let status = "inactive";
                  if (
                    filePercentage >= searchRange.start &&
                    filePercentage <= searchRange.end
                  ) {
                    status = "active";
                    if (index === currentFileIndex) {
                      status = "current";
                    }
                  }
                  const handleFileClick = () => {
                    const filePercentage = (index / files.length) * 100;
                    // Expand search range if needed
                    const newRange = {
                      start: Math.min(searchRange.start, filePercentage),
                      end: Math.max(searchRange.end, filePercentage),
                    };
                    setSearchRange(newRange);
                    setCurrentGuess(filePercentage);
                    setCurrentFileIndex(index);
                  };

                  return (
                    <li
                      key={file.path}
                      className={`file-status-${status}`}
                      onClick={handleFileClick}
                      ref={
                        index === currentFileIndex
                          ? (el) => {
                              if (el) {
                                el.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                              }
                            }
                          : undefined
                      }
                    >
                      {file.name}
                    </li>
                  );
                })}
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
