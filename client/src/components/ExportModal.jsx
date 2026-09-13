import React, { useState } from 'react';
import { generateMarkdownContent, generatePlainTextContent } from '../services/exportGenerators.js';

export default function ExportModal({ studyData, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!studyData) return null;

  const baseName = (studyData.filename || 'studyflow_notes').replace(/\.[^/.]+$/, '');

  const triggerDownload = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const md = generateMarkdownContent(studyData);
    triggerDownload(md, `${baseName}_revision_guide.md`, 'text/markdown;charset=utf-8');
  };

  const handleExportText = () => {
    const txt = generatePlainTextContent(studyData);
    triggerDownload(txt, `${baseName}_study_sheet.txt`, 'text/plain;charset=utf-8');
  };

  const handleExportJson = () => {
    const json = JSON.stringify(studyData, null, 2);
    triggerDownload(json, `${baseName}_data.json`, 'application/json;charset=utf-8');
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownContent(studyData);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="ds-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="ds-modal-box export-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-header">
          <div className="export-modal-title-group">
            <span className="export-modal-kicker">SHARE & EXPORT</span>
            <h3 id="export-modal-title" className="ds-modal-title">Export Study Flow</h3>
          </div>
          <button
            type="button"
            className="ds-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="ds-modal-desc">
          Download your detailed revision notes and interactive quiz in shareable academic formats.
        </p>

        <div className="export-options-grid">
          {/* Markdown Option */}
          <div className="export-option-card" onClick={handleExportMarkdown}>
            <div className="export-card-left">
              <span className="export-format-badge">.MD</span>
              <div className="export-info">
                <span className="export-name">Markdown Document</span>
                <span className="export-desc">Full revision guide with notes, quiz questions, and answer key.</span>
              </div>
            </div>
            <button type="button" className="btn-secondary-sm">Download</button>
          </div>

          {/* Plain Text Option */}
          <div className="export-option-card" onClick={handleExportText}>
            <div className="export-card-left">
              <span className="export-format-badge">.TXT</span>
              <div className="export-info">
                <span className="export-name">Plain Study Sheet</span>
                <span className="export-desc">Print-friendly text sheet formatted for offline reading.</span>
              </div>
            </div>
            <button type="button" className="btn-secondary-sm">Download</button>
          </div>

          {/* JSON Option */}
          <div className="export-option-card" onClick={handleExportJson}>
            <div className="export-card-left">
              <span className="export-format-badge">.JSON</span>
              <div className="export-info">
                <span className="export-name">Structured JSON Data</span>
                <span className="export-desc">Raw notes and quiz payload for custom tools or flashcards.</span>
              </div>
            </div>
            <button type="button" className="btn-secondary-sm">Download</button>
          </div>
        </div>

        <div className="export-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyMarkdown}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied Markdown!</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy All to Clipboard</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
