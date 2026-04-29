import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QAInterface from "@/components/QAInterface";
import { API_ROOT } from "@/services/urlConfig";
import { useAuthStore } from "@/store/useAuthStore";
import "./AcademicAssistant.css";

const guidePoints = [
  "Open a resource first if you want an answer based on that file.",
  "Use the Ask AI section after selecting a resource.",
  "Ask one clear question at a time.",
  "Look at the source snippets before you rely on an answer.",
  "If the answer is too broad, ask a smaller follow-up question.",
];

const exampleQuestions = [
  "Summarize the main idea of this chapter.",
  "Explain this topic in simple words.",
  "What formula is being used here?",
  "Which page mentions this concept?",
];

export default function AcademicAssistant() {
  const { resourceId } = useParams();
  const { token } = useAuthStore();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(Boolean(resourceId));
  const [error, setError] = useState(null);

  const fetchResource = useCallback(async () => {
    if (!resourceId) {
      setResource(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_ROOT}/resources/${resourceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load this resource.");
      }

      const data = await response.json();
      setResource(data.data?.resource || null);
    } catch (err) {
      console.error("Error fetching resource:", err);
      setError(err.message || "Could not load this resource.");
    } finally {
      setLoading(false);
    }
  }, [resourceId, token]);

  useEffect(() => {
    void fetchResource();
  }, [fetchResource]);

  return (
    <div className="academic-assistant">
      <div className="assistant-container">
        <div className="assistant-main">
          <header className="assistant-header">
            <p className="assistant-eyebrow">AI Assistant</p>
            <h1 className="header-title">
              {resourceId ? "Ask questions about this resource." : "Use AI from inside a resource."}
            </h1>
            <p className="header-subtitle">
              {resourceId
                ? "Answers stay tied to the selected document and include source snippets when context is available."
                : "The best place to ask a question is on a resource page. That keeps the answer tied to the document you are reading."}
            </p>
          </header>

          {resourceId && (
            <section className="assistant-sidebar">
              {loading ? (
                <div className="sidebar-loading">
                  <p className="sidebar-title">Waking up server...</p>
                  <p className="sidebar-copy">This may take a few seconds on the deployed app.</p>
                </div>
              ) : error ? (
                <div className="sidebar-error">
                  <p>{error}</p>
                </div>
              ) : resource ? (
                <div className="resource-info">
                  <p className="sidebar-label">Selected resource</p>
                  <h2 className="resource-title">{resource.title}</h2>
                  <div className="resource-meta-grid">
                    <div>
                      <span className="meta-label">Subject</span>
                      <span className="meta-value">{resource.subject || "Not set"}</span>
                    </div>
                    <div>
                      <span className="meta-label">Category</span>
                      <span className="meta-value">{resource.category || "Not set"}</span>
                    </div>
                    <div>
                      <span className="meta-label">Semester</span>
                      <span className="meta-value">
                        {resource.semester ? `Semester ${resource.semester}` : "Not set"}
                      </span>
                    </div>
                  </div>
                  <Link to={`/resources/${resourceId}`} className="btn-outline assistant-link">
                    View full resource
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {resourceId && resource && !loading && !error ? (
            <section className="assistant-qa-panel">
              <div className="qa-panel-header">
                <p className="assistant-eyebrow">Document Q&A</p>
                <h2>Ask about {resource.title}</h2>
                <p>
                  Ask a focused question and review the answer with retrieved
                  snippets from this document.
                </p>
              </div>
              <QAInterface resourceId={resourceId} />
            </section>
          ) : null}

          <section className="guide-content">
            <div className="guide-grid">
              <div className="guide-card">
                <h2>How to use it</h2>
                <ul className="guide-list">
                  {guidePoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="guide-card">
                <h2>Good question examples</h2>
                <ul className="guide-list">
                  {exampleQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="guide-card">
              <h2>When to use this tab</h2>
              <p>
                Use this page as a quick guide. When you are ready to ask something real,
                choose a resource and use the document Q&A area.
              </p>
              <div className="assistant-actions">
                <Link to="/resources" className="btn-primary">
                  Browse resources
                </Link>
                <Link to="/search" className="btn-outline">
                  Search by topic
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
