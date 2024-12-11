import { useState } from "react";
import "./App.css";
import Menu from "./components/Menu";
import FileTransfer from "./components/FileTransfer";
import SplitFiles from "./components/SplitFiles";

const menuOptions = [
  {
    id: 'transfer',
    title: 'Load Audio onto Headphones',
    description: 'Transfer and organize audio files to your device with optional shuffle functionality.',
    component: FileTransfer
  },
  {
    id: 'split',
    title: 'Cut Audio into Smaller Pieces',
    description: 'Split long audio files into smaller segments of specified duration.',
    component: SplitFiles
  }
];

function App() {
  const [selectedOption, setSelectedOption] = useState<typeof menuOptions[0] | null>(null);

  return (
    <main className="container">
      {selectedOption ? (
        <div className="content">
          <button 
            className="back-button"
            onClick={() => setSelectedOption(null)}
          >
            ← Back to Menu
          </button>
          <selectedOption.component />
        </div>
      ) : (
        <Menu 
          options={menuOptions} 
          onSelect={setSelectedOption}
        />
      )}
    </main>
  );
}

export default App;
