import { useState } from "react";
import "./App.css";
import FileTransfer from "./components/FileTransfer";
import SplitFiles from "./components/SplitFiles";

function App() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'split'>('transfer');

  return (
    <main className="container">
      <h1>OpenSwim Audio Tools</h1>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          File Transfer
        </button>
        <button 
          className={`tab ${activeTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveTab('split')}
        >
          Split Files
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'transfer' ? <FileTransfer /> : <SplitFiles />}
      </div>
    </main>
  );
}

export default App;
