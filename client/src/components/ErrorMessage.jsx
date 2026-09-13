import React from 'react';

export default function ErrorMessage({ error, onRetry, onReset }) {
  if (!error) return null;

  // Provide helpful context-specific guidance based on error keywords
  const isNoTextError = error.toLowerCase().includes('scanned') || error.toLowerCase().includes('no readable text') || error.toLowerCase().includes('selectable text');
  const isSizeError = error.toLowerCase().includes('exceeds') || error.toLowerCase().includes('25 mb') || error.toLowerCase().includes('limit');
  const isApiKeyError = error.toLowerCase().includes('api key') || error.toLowerCase().includes('authentication failed');
  const isQuotaError = error.toLowerCase().includes('quota') || error.toLowerCase().includes('rate limit');
  const isConnectionError = error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('offline') || error.toLowerCase().includes('network') || error.toLowerCase().includes('timed out');

  return (
    <div id="error-message-container" className="error-card" role="alert">
      <div className="error-icon-wrapper">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div className="error-body">
        <h3 className="error-heading">Processing Issue</h3>
        <p className="error-text">{error}</p>

        {isApiKeyError && (
          <div className="error-suggestion">
            <strong>API Key Required:</strong> Click the <strong>Gemini Flash</strong> button in the top navigation bar to enter your free Google Gemini API key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Google AI Studio</a>.
          </div>
        )}

        {isQuotaError && (
          <div className="error-suggestion">
            <strong>Quota Notice:</strong> The Google Gemini free rate limit or quota was exceeded. Please wait a minute or configure your own personal API key in the top bar.
          </div>
        )}

        {isConnectionError && (
          <div className="error-suggestion">
            <strong>Network Connectivity:</strong> Unable to connect to Google Generative AI services from your browser. Please check your internet connection and try again.
          </div>
        )}

        {isNoTextError && (
          <div className="error-suggestion">
            <strong>Scanned Document:</strong> The uploaded document contains scanned images without an embedded text layer. Please export the slides or document as a native text-based PDF or Word document.
          </div>
        )}

        {isSizeError && (
          <div className="error-suggestion">
            <strong>Size Exceeded:</strong> Please compress the document or split it into smaller chapters under 25 MB.
          </div>
        )}
      </div>

      <div className="error-actions">
        {onRetry && (
          <button id="retry-btn" type="button" className="btn-secondary" onClick={onRetry}>
            Try Again
          </button>
        )}
        {onReset && (
          <button id="upload-different-btn" type="button" className="btn-primary-sm" onClick={onReset}>
            Upload Another Document
          </button>
        )}
      </div>
    </div>
  );
}
