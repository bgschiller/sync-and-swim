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
  onStartOver: () => void;
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
  searchRange: { start: number; end: number };
  setSearchRange: (range: { start: number; end: number }) => void;
}

function AudioBinarySearch({ 
  files, 
  onStartOver,
  currentFileIndex,
  setCurrentFileIndex,
  searchRange,
  setSearchRange
}: AudioBinarySearchProps) {
  const [currentGuess, setCurrentGuess] = useState<number>(50);

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
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [searchRange, setSearchRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 100 });

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
                setFiles(audioFiles);
              }}
            />
          </div>

          {audioDir && (
            <>
              {files.length > 0 && !isSearching && (
                <button
                  onClick={() => setIsSearching(true)}
                  className="feedback-btn yes"
                  style={{ marginTop: '1rem' }}
                >
                  Find my place
                </button>
              )}
              {files.length > 0 && isSearching && (
                <AudioBinarySearch
                  files={files}
                  currentFileIndex={currentFileIndex}
                  setCurrentFileIndex={setCurrentFileIndex}
                  searchRange={searchRange}
                  setSearchRange={setSearchRange}
                  onStartOver={() => {
                    setIsSearching(false);
                    setSearchRange({ start: 0, end: 100 });
                  }}
                />
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
                  if (isSearching && 
                      filePercentage >= searchRange.start &&
                      filePercentage <= searchRange.end
                  ) {
                    status = "active";
                    if (index === currentFileIndex) {
                      status = "current";
                    }
                  }
                  const handleFileClick = () => {
                    if (!isSearching) return;
                    const filePercentage = (index / files.length) * 100;
                    setSearchRange({
                      start: Math.min(searchRange.start, filePercentage),
                      end: Math.max(searchRange.end, filePercentage),
                    });
                    setCurrentGuess(filePercentage);
                    setCurrentFileIndex(index);
                  };

                  return (
                    <li
                      key={file.path}
                      className={`file-status-${status}`}
                      onClick={handleFileClick}
                      ref={
                        index === currentFileIndex && isSearching
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
