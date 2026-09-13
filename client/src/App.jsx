import React, { useState } from 'react';
import UploadZone from './components/UploadZone';
import NotesView from './components/NotesView';
import QuizView from './components/QuizView';
import LoadingState from './components/LoadingState';
import ErrorMessage from './components/ErrorMessage';
import ExportModal from './components/ExportModal';
import { processAndGenerate, getApiKey, setApiKey } from './services/clientRAG';

export default function App() {
  const [appState, setAppState] = useState('IDLE'); // 'IDLE' | 'LOADING' | 'RESULTS' | 'ERROR'
  const [currentFile, setCurrentFile] = useState(null);
  const [lastOptions, setLastOptions] = useState({});
  const [studyData, setStudyData] = useState(null); // { filename, notes, quiz, meta }
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('NOTES'); // 'NOTES' | 'QUIZ'
  const [loadingStage, setLoadingStage] = useState('Reading document in browser...');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState(getApiKey());

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showKeyModal) setShowKeyModal(false);
        if (showExportModal) setShowExportModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKeyModal, showExportModal]);

  const handleGenerate = async (file, options = {}) => {
    setCurrentFile(file);
    setLastOptions(options);
    setAppState('LOADING');
    setErrorMessage('');
    setLoadingStage('Extracting document in browser...');

    try {
      const data = await processAndGenerate(file, options, (progress) => {
        if (progress.label) {
          setLoadingStage(progress.label);
        }
      });

      setStudyData(data);
      setActiveTab('NOTES');
      setAppState('RESULTS');
    } catch (err) {
      console.error('[StudyFlow Client] Processing failed:', err);
      const displayMsg = err.message || 'Failed to process the document. Please try again.';
      setErrorMessage(displayMsg);
      setAppState('ERROR');
    }
  };

  const handleReset = () => {
    setCurrentFile(null);
    setStudyData(null);
    setErrorMessage('');
    setActiveTab('NOTES');
    setAppState('IDLE');
    setShowExportModal(false);
  };

  const handleRetry = () => {
    if (currentFile) {
      handleGenerate(currentFile, lastOptions);
    } else {
      handleReset();
    }
  };

  const handleSaveKey = () => {
    setApiKey(keyInputValue);
    setShowKeyModal(false);
  };

  const handleResetDefaultKey = () => {
    setApiKey('');
    const resolved = getApiKey();
    setKeyInputValue(resolved);
    setShowKeyModal(false);
  };

  const pers = studyData?.meta?.personalization;

  return (
    <div className="ds-app">
      {/* DeepStudent Masthead */}
      <header className="ds-masthead">
        <div className="ds-masthead-inner">
          <div className="ds-pill" onClick={handleReset} style={{ cursor: 'pointer' }}>
            <span className="ds-pill-mark">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </span>
            <span className="ds-pill-brand">StudyFlow</span>
            <span className="ds-pill-divider">/</span>
            <span className="ds-pill-sub">AI Learning Workbench</span>
          </div>

          <div className="ds-masthead-meta">
            <button
              id="header-api-key-btn"
              type="button"
              className="ds-pill ds-pill-action"
              onClick={() => {
                setKeyInputValue(getApiKey());
                setShowKeyModal(true);
              }}
              title="Configure Gemini API Key"
            >
              <span className="ds-key-badge-active"></span>
              <span>Gemini Flash (Browser)</span>
            </button>

            {appState === 'RESULTS' && (
              <button
                id="header-export-btn"
                type="button"
                className="ds-pill ds-pill-action"
                onClick={() => setShowExportModal(true)}
                title="Export revision notes & quiz"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export Material</span>
              </button>
            )}

            {appState === 'RESULTS' ? (
              <button
                id="header-upload-new-btn"
                type="button"
                className="ds-pill ds-pill-action"
                onClick={handleReset}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>New Document</span>
              </button>
            ) : (
              <span className="ds-pill ds-pill-dim">Multi-Format RAG</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Desktop Workbench Stage */}
      <main className="ds-stage">
        <div className="ds-window">
          {/* macOS-style Window Titlebar */}
          <div className="ds-window-titlebar">
            <div className="ds-window-dots">
              <span className="ds-dot ds-dot-close"></span>
              <span className="ds-dot ds-dot-min"></span>
              <span className="ds-dot ds-dot-max"></span>
            </div>

            <div className="ds-window-center">
              <div className="ds-window-chip">
                <span className={`ds-status-dot ${appState === 'LOADING' ? 'pulse' : ''}`}></span>
                <span className="ds-window-chip-text">
                  {currentFile ? currentFile.name : 'StudyFlow Workspace'}
                </span>
              </div>
            </div>

            <div className="ds-window-right">
              <span className="ds-badge-mode">
                {studyData?.meta?.format ? `${studyData.meta.format} Engine` : 'Multi-Format RAG'}
              </span>
            </div>
          </div>

          {/* Window Interior Content */}
          <div className="ds-window-body">
            {appState === 'IDLE' && (
              <UploadZone
                onFileSelected={handleGenerate}
                isLoading={false}
              />
            )}

            {appState === 'LOADING' && (
              <LoadingState
                filename={currentFile?.name}
                customStage={loadingStage}
              />
            )}

            {appState === 'ERROR' && (
              <ErrorMessage
                error={errorMessage}
                onRetry={handleRetry}
                onReset={handleReset}
              />
            )}

            {appState === 'RESULTS' && studyData && (
              <div className="results-container">
                {/* RAG Context Information Strip */}
                <div className="ds-meta-strip">
                  <div className="ds-meta-item">
                    <span>Document:</span>
                    <span className="ds-meta-val">{studyData.filename}</span>
                  </div>
                  <span className="ds-meta-sep">/</span>
                  <div className="ds-meta-item">
                    <span>Format:</span>
                    <span className="ds-meta-val">{studyData.meta?.format || 'PDF'}</span>
                  </div>
                  <span className="ds-meta-sep">/</span>
                  <div className="ds-meta-item">
                    <span>Pages/Slides:</span>
                    <span className="ds-meta-val">{studyData.meta?.totalPages || 1}</span>
                  </div>
                  <span className="ds-meta-sep">/</span>
                  <div className="ds-meta-item">
                    <span>Words:</span>
                    <span className="ds-meta-val">{(studyData.meta?.totalWords || 0).toLocaleString()}</span>
                  </div>
                  <span className="ds-meta-sep">/</span>
                  <div className="ds-meta-item">
                    <span>RAG Chunks:</span>
                    <span className="ds-meta-val">{studyData.meta?.chunksCount || 0}</span>
                  </div>
                  {pers?.subject && (
                    <>
                      <span className="ds-meta-sep">/</span>
                      <div className="ds-meta-item">
                        <span>Course:</span>
                        <span className="ds-meta-val">{pers.subject}</span>
                      </div>
                    </>
                  )}
                  {pers?.academicLevel && (
                    <>
                      <span className="ds-meta-sep">/</span>
                      <div className="ds-meta-item">
                        <span>Level:</span>
                        <span className="ds-meta-val">{pers.academicLevel}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Workbench Segmented Tab Bar with Export Action */}
                <div className="results-nav-wrapper">
                  <div className="results-tabs-nav">
                    <button
                      id="tab-notes-btn"
                      type="button"
                      className={`tab-btn ${activeTab === 'NOTES' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('NOTES')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>Revision Notes</span>
                      <span className="tab-badge">{studyData.notes?.length || 0} Topics</span>
                    </button>

                    <button
                      id="tab-quiz-btn"
                      type="button"
                      className={`tab-btn ${activeTab === 'QUIZ' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('QUIZ')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>Interactive Quiz</span>
                      <span className="tab-badge">{studyData.quiz?.length || 5} Questions</span>
                    </button>
                  </div>

                  <button
                    id="export-trigger-btn"
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => setShowExportModal(true)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Export Study Guide</span>
                  </button>
                </div>

                {/* Active Tab View */}
                <div className="tab-content">
                  {activeTab === 'NOTES' && (
                    <NotesView
                      notes={studyData.notes}
                      filename={studyData.filename}
                    />
                  )}

                  {activeTab === 'QUIZ' && (
                    <QuizView
                      quiz={studyData.quiz}
                      filename={studyData.filename}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          studyData={studyData}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* API Key Configuration Modal */}
      {showKeyModal && (
        <div
          className="ds-modal-overlay"
          onClick={() => setShowKeyModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="key-modal-title"
        >
          <div className="ds-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ds-modal-header">
              <h4 id="key-modal-title" className="ds-modal-title">Gemini API Key Configuration</h4>
              <button
                type="button"
                className="ds-modal-close"
                onClick={() => setShowKeyModal(false)}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="ds-modal-body">
              <p className="ds-modal-desc">
                StudyFlow executes directly in your browser with zero backend server required. Your key is stored securely in your local browser session.
              </p>
              <input
                id="gemini-key-input"
                type="password"
                className="ds-modal-input"
                value={keyInputValue}
                onChange={(e) => setKeyInputValue(e.target.value)}
                placeholder="Enter Gemini API Key..."
                autoFocus
              />
            </div>

            <div className="ds-modal-footer">
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={handleResetDefaultKey}
              >
                Reset Default
              </button>
              <button
                id="save-key-btn"
                type="button"
                className="btn-primary-sm"
                onClick={handleSaveKey}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
