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
  bstState: BstStep | BstSuccess;
  setBstState: (state: BstStep | BstSuccess) => void;
  onDeleteFiles?: (files: AudioFile[]) => Promise<void>;
}
interface BstArgs {
  range: { start: number; end: number };
  index: number;
  sense: "yes-i-remember" | "no-i-dont-remember";
}
interface BstStep {
  type: "step";
  range: { start: number; end: number };
  index: number;
  remainingSteps: number;
}
interface BstSuccess {
  index: number;
  range: { start: number; end: number };
  type: "success";
}
export function bstStep(args: BstArgs): BstStep | BstSuccess {
  if (args.range.end - args.range.start <= 1) {
    const index =
      args.sense === "yes-i-remember" ? args.range.end : args.range.start;
    return {
      type: "success",
      index,
      range: { start: index, end: index },
    };
  }
  const newStart =
    args.sense === "yes-i-remember" ? args.index + 1 : args.range.start;
  const newEnd =
    args.sense === "no-i-dont-remember" ? args.index - 1 : args.range.end;

  if (newStart >= newEnd) {
    return {
      type: "success",
      index: args.range.end,
      range: { start: args.range.end, end: args.range.end },
    };
  }
  // Choose the ceiling of the midpoint because we want to err on the side
  // of giving the user more content to listen to. That is, if we've narrowed
  // down the range to two tracks and the user says "yes" to the first one, we
  // don't actually know whether they've heard the whole thing or not.
  const newGuess = Math.ceil((newStart + newEnd) / 2);
  const remainingSteps = Math.ceil(Math.log2(newEnd - newStart));
  return {
    type: "step",
    range: { start: newStart, end: newEnd },
    index: newGuess,
    remainingSteps,
  };
}

function AudioBinarySearch({
  files,
  bstState,
  setBstState,
  onDeleteFiles,
}: AudioBinarySearchProps) {
  const [isDeletingFiles, setIsDeletingFiles] = useState(false);
  function onStartOver() {
    setBstState(
      bstStep({
        range: { start: 0, end: files.length },
        index: 0,
        sense: "yes-i-remember",
      }),
    );
  }

  return (
    <div className="playback-section">
      <div className="current-file">Playing: {files[bstState.index].name}</div>
      <audio
        autoPlay={bstState.type === "step"}
        controls
        key={files[bstState.index].path}
        src={convertFileSrc(files[bstState.index].path)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      {bstState.type === "step" ? (
        <div className="feedback-controls">
          <p>
            Does this part sound familiar?{" "}
            <span className="steps-remaining">
              Approximately {bstState.remainingSteps} steps needed
            </span>
          </p>
          <div className="feedback-buttons">
            <button
              onClick={() => {
                setBstState(
                  bstStep({
                    ...bstState,
                    sense: "yes-i-remember",
                  }),
                );
              }}
              className="feedback-btn yes"
            >
              Yes, I remember this
            </button>
            <button
              onClick={() => {
                setBstState(
                  bstStep({
                    ...bstState,
                    sense: "no-i-dont-remember",
                  }),
                );
              }}
              className="feedback-btn no"
            >
              No, don't remember this
            </button>
            <button
              onClick={() => {
                setBstState({
                  ...bstState,
                  index: bstState.index - 1,
                });
              }}
              className="feedback-btn unsure"
            >
              Not sure
            </button>
          </div>
          <button onClick={onStartOver} className="feedback-btn start-over">
            Start Over
          </button>
        </div>
      ) : (
        <div className="feedback-controls">
          <p>
            Found it! You were last listening to{" "}
            <strong>{files[bstState.index].name}</strong>.
          </p>
          {!isDeletingFiles && onDeleteFiles && bstState.index > 0 && (
            <button
              onClick={() => setIsDeletingFiles(true)}
              className="feedback-btn no"
              style={{ marginBottom: "1rem" }}
            >
              Delete earlier files
            </button>
          )}
          {isDeletingFiles && (
            <div style={{ marginBottom: "1rem" }}>
              <p className="warning">
                This will remove {files[0].name} through{" "}
                {files[bstState.index - 1].name} ({bstState.index} files)
              </p>
              <button
                onClick={async () => {
                  if (onDeleteFiles) {
                    await onDeleteFiles(files.slice(0, bstState.index));
                    setIsDeletingFiles(false);
                  }
                }}
                className="feedback-btn no"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setIsDeletingFiles(false)}
                className="feedback-btn unsure"
                style={{ marginLeft: "1rem" }}
              >
                Cancel
              </button>
            </div>
          )}
          <button onClick={onStartOver} className="feedback-btn start-over">
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

function FindPlace({ onSelectOption }: FindPlaceProps) {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [audioDir, setAudioDir] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [bstState, setBstState] = useState<BstStep | BstSuccess>(
    bstStep({
      range: { start: 0, end: 100 },
      index: 0,
      sense: "yes-i-remember",
    }),
  );

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
                  style={{ marginTop: "1rem" }}
                >
                  Find my place
                </button>
              )}
              {files.length > 0 && isSearching && (
                <AudioBinarySearch
                  files={files}
                  bstState={bstState}
                  setBstState={setBstState}
                  onDeleteFiles={async (filesToDelete) => {
                    try {
                      await invoke("delete_files", { files: filesToDelete });
                      const remainingFiles = files.slice(filesToDelete.length);
                      setFiles(remainingFiles);
                      setBstState({
                        type: "success",
                        index: 0,
                        range: { start: 0, end: 0 },
                      });
                    } catch (error) {
                      console.error("Failed to delete files:", error);
                      alert("Failed to delete files: " + error);
                    }
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
                  let status = isSearching ? "inactive" : "active";
                  if (
                    isSearching &&
                    index >= bstState.range.start &&
                    index <= bstState.range.end
                  ) {
                    status = "active";
                    if (index === bstState.index) {
                      status = "current";
                    }
                  }
                  const handleFileClick = () => {
                    if (!isSearching) return;
                    setBstState({
                      ...bstState,
                      index,
                      range: {
                        start: Math.min(bstState.range.start, index),
                        end: Math.max(bstState.range.end, index),
                      },
                    });
                  };

                  return (
                    <li
                      key={file.path}
                      className={`file-status-${status} file-status-searching-${isSearching}`}
                      onClick={handleFileClick}
                      ref={
                        index === bstState.index && isSearching
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
