import React from 'react';

export default function ErrorMessage({ error, onRetry, onReset }) {
  if (!error) return null;

  // Provide helpful context-specific guidance based on error keywords
  const isNoTextError = error.toLowerCase().includes('scanned') || error.toLowerCase().includes('no readable text');
  const isSizeError = error.toLowerCase().includes('exceeds') || error.toLowerCase().includes('15 mb');
  const isApiKeyError = error.toLowerCase().includes('gemini_api_key') || error.toLowerCase().includes('api key');
  const isConnectionError = error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('offline') || error.toLowerCase().includes('network');

  return (
    <div id="error-message-container" className="error-card">
      <div className="error-icon-wrapper">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div className="error-body">
        <h3 className="error-heading">Processing Issue</h3>
        <p className="error-text">{error}</p>

        {isNoTextError && (
          <div className="error-suggestion">
            <strong>Tip:</strong> The PDF might contain rasterized scanned images of slides without an embedded digital text layer. Try exporting the presentation or document as a native text-based PDF.
          </div>
        )}

        {isSizeError && (
          <div className="error-suggestion">
            <strong>Tip:</strong> Please compress the PDF or split it to keep the file under 15 MB.
          </div>
        )}

        {isApiKeyError && (
          <div className="error-suggestion">
            <strong>Setup Required:</strong> Add your Google Gemini API key to <code>.env</code> in the project root:
            <pre className="error-code-block">GEMINI_API_KEY=AIzaSy...</pre>
          </div>
        )}

        {isConnectionError && (
          <div className="error-suggestion">
            <strong>Backend Server Offline:</strong> The web app could not reach the backend server at <code>http://localhost:5000</code>. Start both client and server concurrently with:
            <pre className="error-code-block">npm run dev</pre>
            <p style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>Or start the backend independently in a separate terminal: <code>npm run dev:server</code></p>
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
            Upload Another PDF
          </button>
        )}
      </div>
    </div>
  );
}
