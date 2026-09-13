import React, { useState } from 'react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizView({ quiz, filename }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showScorecard, setShowScorecard] = useState(false);

  if (!quiz || quiz.length === 0) {
    return (
      <div className="empty-state">
        <p>No quiz questions generated for this document.</p>
      </div>
    );
  }

  const totalQuestions = quiz.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  let correctCount = 0;
  quiz.forEach((q, idx) => {
    if (selectedAnswers[idx] !== undefined && selectedAnswers[idx] === q.correctAnswerIndex) {
      correctCount += 1;
    }
  });

  const handleSelectOption = (questionIndex, optionIndex) => {
    if (selectedAnswers[questionIndex] !== undefined) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowScorecard(false);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowScorecard(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowScorecard(false);
    }
  };

  const currentQ = quiz[currentIndex];
  const currentAnswer = selectedAnswers[currentIndex];
  const isCurrentAnswered = currentAnswer !== undefined;
  const isCurrentCorrect = isCurrentAnswered && currentAnswer === currentQ.correctAnswerIndex;
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  return (
    <div id="quiz-view-container" className="quiz-view">
      {/* Stepper Progress Bar (Capsule Stepper) */}
      <div className="quiz-stepper-container">
        <div className="quiz-stepper">
          {quiz.map((q, idx) => {
            const isCurrent = idx === currentIndex && !showScorecard;
            const isAnswered = selectedAnswers[idx] !== undefined;
            const isCorrect = isAnswered && selectedAnswers[idx] === q.correctAnswerIndex;

            let stepClass = 'quiz-step-btn';
            if (isCurrent) stepClass += ' step-active';
            if (isAnswered) stepClass += isCorrect ? ' step-correct' : ' step-incorrect';

            return (
              <button
                key={idx}
                id={`quiz-step-${idx}`}
                type="button"
                className={stepClass}
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowScorecard(false);
                }}
                title={`Question ${idx + 1}: ${isAnswered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Unanswered'}`}
              >
                <span className="step-num">0{idx + 1}</span>
                {isAnswered && (
                  <span className="step-indicator-icon">
                    {isCorrect ? '✓' : '✕'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="quiz-score-pill">
          <span className="score-pill-label">Score</span>
          <span id="quiz-score-display" className="score-pill-val">
            {correctCount} / {totalQuestions}
          </span>
          {answeredCount === totalQuestions && (
            <button
              type="button"
              className={`scorecard-toggle-btn ${showScorecard ? 'active' : ''}`}
              onClick={() => setShowScorecard((prev) => !prev)}
            >
              {showScorecard ? 'Back to Card' : 'Scorecard'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Single Question Card OR Scorecard */}
      {showScorecard ? (
        /* Full Scorecard Summary View */
        <div id="quiz-scorecard-view" className="quiz-scorecard">
          <div className="scorecard-header">
            <span className="scorecard-kicker">ASSESSMENT COMPLETE</span>
            <h2 className="scorecard-title">Quiz Performance Summary</h2>
          </div>

          <div className="scorecard-metrics">
            <div className="metric-box">
              <span className="metric-label">Final Score</span>
              <span className="metric-val">{correctCount} <span className="metric-total">/ {totalQuestions}</span></span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Accuracy</span>
              <span className="metric-val">{percentage}%</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Standing</span>
              <span className="metric-val metric-badge">
                {correctCount === totalQuestions
                  ? 'Mastery'
                  : correctCount >= 3
                  ? 'Passed'
                  : 'Review Required'}
              </span>
            </div>
          </div>

          {/* Question Review Breakdown */}
          <div className="scorecard-breakdown">
            <h4 className="breakdown-title">Question Breakdown</h4>
            <div className="breakdown-list">
              {quiz.map((q, idx) => {
                const userAns = selectedAnswers[idx];
                const isCorrect = userAns !== undefined && userAns === q.correctAnswerIndex;

                return (
                  <div
                    key={idx}
                    className={`breakdown-row ${isCorrect ? 'row-correct' : 'row-incorrect'}`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowScorecard(false);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to review this question"
                  >
                    <div className="breakdown-left">
                      <span className={`breakdown-status-dot ${isCorrect ? 'dot-correct' : 'dot-incorrect'}`}>
                        {isCorrect ? '✓' : '✕'}
                      </span>
                      <span className="breakdown-num">Q0{idx + 1}</span>
                      <span className="breakdown-question">{q.question}</span>
                    </div>
                    <span className="breakdown-action">Review →</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="scorecard-actions">
            <button
              id="retake-quiz-btn"
              type="button"
              className="btn-secondary"
              onClick={handleResetQuiz}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span>Retake Quiz</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setCurrentIndex(0);
                setShowScorecard(false);
              }}
            >
              <span>Review From Question 1</span>
            </button>
          </div>
        </div>
      ) : (
        /* Single Question Card View */
        <div id={`quiz-question-card-${currentIndex}`} className="quiz-card-focused">
          <div className="question-header">
            <span className="question-pill">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            {isCurrentAnswered && (
              <span
                className={`result-indicator ${
                  isCurrentCorrect ? 'indicator-correct' : 'indicator-incorrect'
                }`}
              >
                {isCurrentCorrect ? '✓ Correct' : '✕ Incorrect'}
              </span>
            )}
          </div>

          <h3 className="question-text">{currentQ.question}</h3>

          <div className="options-grid">
            {currentQ.options.map((optionText, optIdx) => {
              const isSelected = currentAnswer === optIdx;
              const isTargetCorrect = currentQ.correctAnswerIndex === optIdx;

              let optionClass = 'option-btn';
              if (isCurrentAnswered) {
                if (isSelected && isTargetCorrect) {
                  optionClass += ' option-correct';
                } else if (isSelected && !isTargetCorrect) {
                  optionClass += ' option-incorrect';
                } else if (!isSelected && isTargetCorrect) {
                  optionClass += ' option-revealed-correct';
                } else {
                  optionClass += ' option-dimmed';
                }
              }

              return (
                <button
                  key={optIdx}
                  id={`q${currentIndex}-option-${optIdx}`}
                  type="button"
                  className={optionClass}
                  onClick={() => handleSelectOption(currentIndex, optIdx)}
                  disabled={isCurrentAnswered}
                >
                  <span className="option-letter">{OPTION_LETTERS[optIdx]}</span>
                  <span className="option-text">{optionText}</span>
                  {isCurrentAnswered && isTargetCorrect && (
                    <span className="option-check-icon">✓</span>
                  )}
                  {isCurrentAnswered && isSelected && !isTargetCorrect && (
                    <span className="option-cross-icon">✕</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal once answered */}
          {isCurrentAnswered && (
            <div id={`q${currentIndex}-explanation`} className="explanation-box">
              <div className="explanation-header">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Academic Explanation</span>
              </div>
              <p className="explanation-text">{currentQ.explanation}</p>
            </div>
          )}

          {/* Question Card Bottom Stepper / Navigation */}
          <div className="quiz-card-nav">
            <button
              id="quiz-prev-btn"
              type="button"
              className="btn-secondary-sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Previous</span>
            </button>

            <div className="quiz-card-nav-center">
              <span className="quiz-card-nav-count">
                {isCurrentAnswered ? 'Answer recorded' : 'Select an answer'}
              </span>
            </div>

            {currentIndex < totalQuestions - 1 ? (
              <button
                id="quiz-next-btn"
                type="button"
                className="btn-primary-sm"
                onClick={handleNext}
              >
                <span>Next Question</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ) : (
              <button
                id="quiz-finish-btn"
                type="button"
                className="btn-primary-sm"
                onClick={() => setShowScorecard(true)}
              >
                <span>View Scorecard</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
