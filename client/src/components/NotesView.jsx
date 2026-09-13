import React, { useState } from 'react';

export default function NotesView({ notes, filename }) {
  const [copied, setCopied] = useState(false);

  if (!notes || notes.length === 0) {
    return (
      <div className="empty-state">
        <p>No revision notes available for this document.</p>
      </div>
    );
  }

  const totalPoints = notes.reduce((acc, curr) => acc + (curr.points?.length || 0), 0);

  const handleCopy = () => {
    let textToCopy = `StudyFlow Comprehensive Revision Notes: ${filename || 'Lecture'}\n\n`;
    notes.forEach((section, idx) => {
      textToCopy += `========================================\n`;
      textToCopy += `SECTION ${idx + 1}: ${section.topic}\n`;
      textToCopy += `========================================\n\n`;
      section.points.forEach((point) => {
        textToCopy += `• ${point}\n\n`;
      });
      textToCopy += '\n';
    });

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div id="notes-view-container" className="notes-view">
      <div className="notes-toolbar">
        <div className="notes-meta">
          <span className="notes-count-pill">{notes.length} Core Topics</span>
          <span className="source-file-pill">{totalPoints} Key Concept Points</span>
          {filename && <span className="source-file-pill">Document: {filename}</span>}
        </div>
        <button
          id="copy-notes-btn"
          type="button"
          className="btn-secondary"
          onClick={handleCopy}
          title="Copy detailed notes to clipboard"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied Notes</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy Detailed Notes</span>
            </>
          )}
        </button>
      </div>

      <div className="notes-grid">
        {notes.map((section, idx) => (
          <div key={idx} className="note-card" id={`note-section-${idx}`}>
            <div className="note-card-header">
              <div className="note-card-title-group">
                <span className="section-number">0{idx + 1}</span>
                <h3 className="section-topic">{section.topic}</h3>
              </div>
              <span className="section-badge">{section.points?.length || 0} Key Points</span>
            </div>
            <ul className="bullet-list">
              {section.points.map((point, pIdx) => (
                <li key={pIdx} className="bullet-item">
                  <span className="bullet-marker"></span>
                  <span className="bullet-text">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
