import { open } from "@tauri-apps/plugin-dialog";
import { useEffect } from "react";
import "./FileChoice.css";

interface FileChoiceProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
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
      {value || `Click to select ${label.toLowerCase()}`}
    </button>
  );
}
