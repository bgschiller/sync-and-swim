import { useState } from 'react';
import './FindPlace.css';

function FindPlace() {
  const [currentFile, setCurrentFile] = useState<string>('');

  return (
    <div className="find-place">
      <h2>Find Your Place</h2>
      <p>Select an audio file to find where you left off in your audiobook or podcast.</p>
      {/* TODO: Implement file selection and playback position finder */}
    </div>
  );
}

export default FindPlace;
