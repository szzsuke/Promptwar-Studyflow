import React, { useState, useEffect } from 'react';

const DEFAULT_STAGES = [
  'Extracting text in browser with PDF.js...',
  'Segmenting pages into RAG sliding-window chunks...',
  'Evaluating semantic density and topic hierarchy...',
  'Synthesizing revision notes via Gemini Flash...',
  'Generating 5-question multiple choice quiz...',
];

export default function LoadingState({ filename, customStage }) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < DEFAULT_STAGES.length - 1 ? prev + 1 : prev));
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  const stage = customStage || DEFAULT_STAGES[currentStageIdx];

  return (
    <div id="loading-state-container" className="loading-card" role="status" aria-live="polite">
      <div className="loading-spinner-wrapper" aria-hidden="true">
        <div className="spinner-ring"></div>
      </div>

      <div className="loading-details">
        <h3 className="loading-title">Processing In Browser</h3>
        <p className="loading-stage-text">{stage}</p>
        {filename && <span className="loading-file-pill">{filename}</span>}
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${((currentStageIdx + 1) / DEFAULT_STAGES.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
