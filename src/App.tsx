import { useState } from "react";
import "./App.css";
import Menu from "./components/Menu";
import FileTransfer from "./components/FileTransfer";
import SplitFiles from "./components/SplitFiles";
import FindPlace from "./components/FindPlace";

const menuOptions = [
  {
    id: "transfer",
    title: "Load Audio onto Headphones",
    description:
      "Shokz headphones order tracks by the date they were added. That can jumble audiobooks if you're not careful. This tool moves them one at a time to make sure they keep the correct order.",
    component: FileTransfer,
  },
  {
    id: "split",
    title: "Cut Audio into Smaller Pieces",
    description:
      "Split audiobooks or podcasts into shorter pieces. This makes it easier to skip forward and backward just a bit without a screen",
    component: SplitFiles,
  },
  {
    id: "findplace",
    title: "Find Your Place in Audiobooks",
    description:
      "Lost your place in an audiobook or podcast? This tool helps you quickly find where you left off by playing short segments.",
    component: FindPlace,
  },
];

function App() {
  const [selectedOption, setSelectedOption] = useState<
    (typeof menuOptions)[0] | null
  >(null);

  return (
    <main className="container">
      {selectedOption ? (
        <div className="content">
          <header>
            <button
              className="back-button"
              onClick={() => setSelectedOption(null)}
            >
              ← Back to Menu
            </button>
            {selectedOption.title && <h2>{selectedOption.title}</h2>}
          </header>
          <selectedOption.component 
            onSelectOption={(optionId) => {
              const option = menuOptions.find(opt => opt.id === optionId);
              if (option) setSelectedOption(option);
            }}
          />
        </div>
      ) : (
        <Menu options={menuOptions} onSelect={setSelectedOption} />
      )}
    </main>
  );
}

export default App;
