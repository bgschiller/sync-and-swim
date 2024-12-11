import { open } from "@tauri-apps/plugin-dialog";
import { useEffect } from "react";
import { homedir } from "@tauri-apps/api/os";
import "./FileChoice.css";

interface FileChoiceProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
}

function abbreviatePath(path: string): string {
  // Replace home directory with ~
  if (path.startsWith("/Users/")) {
    path = path.replace(/^\/Users\/[^/]+/, "~");
  }
  
  // Replace common volumes with shorter names
  path = path.replace(/^\/Volumes\/OpenSwim\/?/, "OpenSwim:/");
  
  // If path is still long, keep start and end
  if (path.length > 40) {
    const parts = path.split("/");
    if (parts.length > 4) {
      return `${parts[0]}/.../${parts[parts.length - 1]}`;
    }
  }
  
  return path;
}

export function FileChoice({ label, value, onChange }: FileChoiceProps) {
  const storageKey = `fileChoice_${label.toLowerCase().replace(/\s+/g, "_")}`;

  useEffect(() => {
    const savedValue = localStorage.getItem(storageKey);
    if (savedValue && !value) {
      onChange(savedValue);
    }
  }, []);

  const handleSelect = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: `Select ${label}`,
    });
    if (selected && !Array.isArray(selected)) {
      localStorage.setItem(storageKey, selected);
      onChange(selected);
    }
  };

  return (
    <button
      className={`file-choice-button ${value ? "file-choice-value" : "file-choice-placeholder"}`}
      onClick={handleSelect}
    >
      {value ? abbreviatePath(value) : `Click to select ${label.toLowerCase()}`}
    </button>
  );
}
