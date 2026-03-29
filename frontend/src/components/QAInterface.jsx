import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { qaService } from "../services/qa";
import "./QAInterface.css";

const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const QAInterface = ({ resourceId = null, onClose = null }) => {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [answerLabel, setAnswerLabel] = useState("AI Generated Answer");
  const [sourceCount, setSourceCount] = useState(0);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const { user } = useAuthStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, sources]);

  const handleAsk = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    if (question.length > 500) {
      setError("Question is too long (max 500 characters)");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    setConfidence(0);
    setSourceCount(0);

    const startTime = Date.now();

    try {
      const response = await qaService.askQuestion(
        question.trim(),
        resourceId ? [resourceId] : [],
      );

      const time = Date.now() - startTime;

      if (response?.answer) {
        setAnswer(response.answer);
        setSources(response.sources || []);
        setProcessingTime(response.processingTime || time);
        setConfidence(response.confidence || 0);
        setAnswerLabel(response.answerLabel || "AI Generated Answer");
        setSourceCount(response.sourceCount || (response.sources || []).length || 0);
        setQuestion("");

        if (user) {
          qaService.storeInteraction({
            userId: user.id || user.uid,
            question: question.trim(),
            answer: response.answer,
            sources: response.sources || [],
            processingTime: response.processingTime || time,
            resourceIds: resourceId ? [resourceId] : [],
          });
        }
      } else {
        setError("Failed to get answer from AI service");
      }
    } catch (err) {
      console.error("QA Error:", err);

      if (err.response?.status === 429) {
        setError("Rate limit exceeded. Please wait before asking another question.");
      } else if (err.response?.status === 503) {
        setError("AI service is currently unavailable. Please try again later.");
      } else if (err.code === "ECONNABORTED") {
        setError("Request timeout. Please try again.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to get answer. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="qa-interface">
      <form onSubmit={handleAsk} className="qa-form">
        <div className="qa-input-wrapper">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the document... (e.g., 'Explain the normalization process in DBMS')"
            disabled={isLoading}
            maxLength={500}
            rows={2}
            className="qa-input"
          />
          <div className="qa-input-footer">
            <span className="char-count">{question.length}/500</span>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="qa-button"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Thinking...
                </>
              ) : (
                "Ask"
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="qa-error">
          <span className="error-icon">!</span>
          <div className="error-content">
            <p className="error-message">{error}</p>
          </div>
          <button className="error-close" onClick={() => setError(null)}>
            Close
          </button>
        </div>
      )}

      {isLoading && (
        <div className="qa-thinking-card">
          <div className="thinking-orb">
            <span className="spinner"></span>
          </div>
          <div>
            <p className="thinking-title">AI is reading the document</p>
            <p className="thinking-subtitle">
              Retrieving chunks, checking citations, and preparing a grounded answer.
            </p>
          </div>
        </div>
      )}

      {answer && (
        <div className="qa-response" ref={scrollRef}>
          <div className="qa-answer-section">
            <div className="qa-answer-header">
              <div>
                <p className="qa-answer-label">{answerLabel || "AI Generated Answer"}</p>
                <h3 className="qa-section-title">Answer</h3>
              </div>
              <div className="qa-metrics-grid">
                <div className="metric-chip">
                  <span className="metric-label">Confidence</span>
                  <strong>{formatPercent(confidence)}</strong>
                </div>
                <div className="metric-chip">
                  <span className="metric-label">Answered in</span>
                  <strong>{(processingTime / 1000).toFixed(2)}s</strong>
                </div>
                <div className="metric-chip">
                  <span className="metric-label">Sources</span>
                  <strong>{sourceCount}</strong>
                </div>
              </div>
            </div>
            <div className="qa-answer-text">{answer}</div>
            <div className="qa-guardrail">
              Answer generated only from retrieved document content.
            </div>
          </div>

          {sources.length > 0 && (
            <div className="qa-sources-section">
              <h3 className="qa-section-title">Sources</h3>
              <div className="sources-list">
                {sources.map((source, index) => (
                  <div key={index} className="source-item">
                    <div className="source-header">
                      <span className="source-number">{index + 1}</span>
                      <div className="source-info">
                        <p className="source-title">{source.title}</p>
                        <p className="source-details">
                          <span>From Page {source.pageNumber || 1}</span>
                          <span className="relevance-score">
                            Match {formatPercent(source.score ?? source.relevanceScore)}
                          </span>
                        </p>
                      </div>
                    </div>
                    {source.snippet ? (
                      <p className="source-snippet">{source.snippet}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="qa-actions">
            <button
              className="action-button copy-button"
              onClick={() => {
                navigator.clipboard.writeText(answer);
                alert("Answer copied to clipboard");
              }}
            >
              Copy Answer
            </button>
            {onClose ? (
              <button className="action-button close-button" onClick={onClose}>
                Close
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!isLoading && !answer && !error && (
        <div className="qa-empty-state">
          <p className="empty-icon">AI</p>
          <p className="empty-text">Ask a document-grounded question</p>
          <p className="empty-hint">
            You&apos;ll get citations, confidence, timing, and visible source evidence.
          </p>
        </div>
      )}
    </div>
  );
};

export default QAInterface;
