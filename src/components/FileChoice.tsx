import { open } from "@tauri-apps/plugin-dialog";
import "./FileTransfer.css";

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
    <div className="file-choice" onClick={() => !value && handleSelect()}>
      {value ? (
        <>
          <div className="file-choice-content">
            <span className="file-choice-label">{label}:</span>
            <span className="file-choice-value">{value}</span>
          </div>
          <button className="file-choice-button" onClick={handleSelect}>
            ⋯
          </button>
        </>
      ) : (
        <div className="file-choice-placeholder">
          Click to select {label.toLowerCase()}
        </div>
      )}
    </div>
  );
}
