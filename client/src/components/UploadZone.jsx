import React, { useState, useRef } from 'react';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTS = ['pdf', 'docx', 'pptx', 'txt', 'md'];

const ACADEMIC_LEVELS = [
  { label: 'High School / AP', value: 'High School / AP' },
  { label: 'Undergraduate', value: 'Undergraduate' },
  { label: 'Graduate / Adv.', value: 'Graduate / Advanced' },
];

const FOCUS_OBJECTIVES = [
  { label: 'Comprehensive', value: 'Comprehensive Mastery' },
  { label: 'Exam Cram', value: 'High-Yield Exam Cram' },
  { label: 'Foundations', value: 'Foundational Concepts' },
];

export default function UploadZone({ onFileSelected, isLoading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [academicLevel, setAcademicLevel] = useState('Undergraduate');
  const [focus, setFocus] = useState('Comprehensive Mastery');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;

    const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
    const isAllowed = ALLOWED_EXTS.includes(ext) || file.type.includes('pdf') || file.type.includes('presentation') || file.type.includes('word') || file.type.startsWith('text/');

    if (!isAllowed) {
      setValidationError(`"${file.name}" is not supported. Please upload a PDF, Word doc (.docx), PowerPoint (.pptx), or text file (.txt/.md).`);
      setSelectedFile(null);
      return false;
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes). Please upload a valid document.');
      setSelectedFile(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setValidationError(`File size (${sizeMB} MB) exceeds the 25 MB limit. Please upload a smaller document.`);
      setSelectedFile(null);
      return false;
    }

    setValidationError('');
    setSelectedFile(file);
    return true;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateFile(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFile && onFileSelected) {
      const options = {
        personalization: {
          subject: subject.trim(),
          academicLevel,
          focus,
        },
      };
      onFileSelected(selectedFile, options);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFormatBadge = (filename) => {
    const ext = filename?.split('.').pop()?.toUpperCase() || 'DOC';
    return ext;
  };

  return (
    <div className="upload-container">
      <div className="upload-hero">
        <div className="kicker">
          <span>AI LEARNING WORKBENCH</span>
        </div>
        <h2 className="hero-heading">Lecture Material to Notes & Quiz</h2>
        <p className="hero-subtext">
          Upload any lecture document in PDF, Word, PowerPoint slides, or plain text. StudyFlow parses the file client-side and synthesizes exhaustive revision notes and an interactive quiz.
        </p>

        <div className="supported-formats-pills">
          <span className="format-pill">PDF Document</span>
          <span className="format-pill">Word (.docx)</span>
          <span className="format-pill">PowerPoint Slides (.pptx)</span>
          <span className="format-pill">Text (.txt / .md)</span>
        </div>
      </div>

      <div
        id="drop-zone"
        className={`dropzone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        {!selectedFile ? (
          <div className="dropzone-prompt">
            <div className="upload-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="dropzone-text">
              <span className="dropzone-title">
                Drop your lecture document here, or <span className="browse-link">browse</span>
              </span>
              <span className="dropzone-hint">Supports PDF, DOCX, PPTX slides, and TXT files up to 25 MB</span>
            </div>
          </div>
        ) : (
          <div className="selected-file-display" onClick={(e) => e.stopPropagation()}>
            <div className="file-info-badge">
              {getFormatBadge(selectedFile.name)}
            </div>
            <div className="file-metadata">
              <span id="selected-file-name" className="file-name">{selectedFile.name}</span>
              <span id="selected-file-size" className="file-size">
                {formatFileSize(selectedFile.size)} • Ready for Client RAG
              </span>
            </div>
            <button
              id="clear-file-btn"
              type="button"
              className="btn-icon-clear"
              onClick={handleClear}
              title="Remove file"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {validationError && (
        <div id="validation-error-alert" className="validation-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{validationError}</span>
        </div>
      )}

      {/* Light Course Personalization Controls */}
      <div className="personalization-card">
        <div className="personalization-header">
          <span className="personalization-kicker">OPTIONAL PERSONALIZATION</span>
          <h4 className="personalization-title">Target Course & Study Focus</h4>
        </div>

        <div className="personalization-body">
          {/* Full-width Subject / Course Input */}
          <div className="field-group full-width">
            <label htmlFor="course-input" className="field-label">Subject or Course Name</label>
            <input
              id="course-input"
              type="text"
              className="ds-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Operating Systems, Neural Networks, Macroeconomics (optional)"
              disabled={isLoading}
            />
          </div>

          {/* Row of Selectors: Academic Target & Primary Objective */}
          <div className="personalization-selectors-row">
            {/* Academic Level */}
            <div className="field-group">
              <label className="field-label">Academic Target</label>
              <div className="segmented-selector">
                {ACADEMIC_LEVELS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`segment-btn ${academicLevel === item.value ? 'active' : ''}`}
                    onClick={() => setAcademicLevel(item.value)}
                    disabled={isLoading}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Study Focus */}
            <div className="field-group">
              <label className="field-label">Primary Objective</label>
              <div className="segmented-selector">
                {FOCUS_OBJECTIVES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`segment-btn ${focus === item.value ? 'active' : ''}`}
                    onClick={() => setFocus(item.value)}
                    disabled={isLoading}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="action-row">
          <button
            id="generate-btn"
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-label">Processing Document...</span>
            ) : (
              <>
                <span>Generate Notes & Quiz</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
