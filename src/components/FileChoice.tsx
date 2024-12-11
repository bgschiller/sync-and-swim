import { open } from "@tauri-apps/plugin-dialog";
import "./FileChoice.css";

interface FileChoiceProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
}

export function FileChoice({ label, value, onChange }: FileChoiceProps) {
  const handleSelect = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: `Select ${label}`,
    });
    if (selected && !Array.isArray(selected)) {
      onChange(selected);
    }
  };

  return (
    <button className="file-choice" onClick={handleSelect}>
      <div
        className={`file-choice-content ${value ? "file-choice-value" : "file-choice-placeholder"}`}
      >
        {value || `Click to select ${label.toLowerCase()}`}
      </div>
    </button>
  );
}
