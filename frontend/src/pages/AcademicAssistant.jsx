import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QAInterface from "../components/QAInterface";
import { useAuthStore } from "../store/useAuthStore";
import { API_ROOT } from "@/services/urlConfig";
import "./AcademicAssistant.css";

const AcademicAssistant = () => {
  const { resourceId } = useParams();
  const { token } = useAuthStore();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(!!resourceId);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("qa");

  // Load resource if resourceId is provided
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
        throw new Error("Failed to load resource");
      }

      const data = await response.json();
      setResource(data.data?.resource || null);
    } catch (err) {
      console.error("Error fetching resource:", err);
      setError(err.message || "Failed to load resource");
    } finally {
      setLoading(false);
    }
  }, [resourceId, token]);

  useEffect(() => {
    void fetchResource();
  }, [fetchResource]);

  return (
    <div className="academic-assistant">
      {/* Header */}
      <div className="assistant-header">
        <div className="header-content">
          <h1 className="header-title">Academic Assistant</h1>
          <p className="header-subtitle">
            Ask questions about your documents and get instant answers
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="assistant-container">
        {/* Sidebar - Resource Info (if viewing specific resource) */}
        {resourceId && (
          <div className="assistant-sidebar">
            {loading ? (
              <div className="sidebar-loading">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text"></div>
              </div>
            ) : error ? (
              <div className="sidebar-error">
                <p>Error: {error}</p>
              </div>
            ) : resource ? (
              <div className="resource-info">
                <h3 className="resource-title">{resource.title}</h3>
                {resource.subject && (
                  <div className="resource-meta">
                    <span className="meta-label">Subject:</span>
                    <span className="meta-value">{resource.subject}</span>
                  </div>
                )}
                {resource.category && (
                  <div className="resource-meta">
                    <span className="meta-label">Category:</span>
                    <span className="meta-value">{resource.category}</span>
                  </div>
                )}
                {resource.semester && (
                  <div className="resource-meta">
                    <span className="meta-label">Semester:</span>
                    <span className="meta-value">Sem {resource.semester}</span>
                  </div>
                )}
                {resource.tags && resource.tags.length > 0 && (
                  <div className="resource-tags">
                    <span className="meta-label">Tags:</span>
                    <div className="tags-list">
                      {resource.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="tag">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Main QA Section */}
        <div className="assistant-main">
          {/* Tabs */}
          <div className="assistant-tabs">
            <button
              className={`tab-button ${activeTab === "qa" ? "active" : ""}`}
              onClick={() => setActiveTab("qa")}
            >
              Ask Question
            </button>
            <button
              className={`tab-button ${activeTab === "guide" ? "active" : ""}`}
              onClick={() => setActiveTab("guide")}
            >
              How It Works
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "qa" ? (
              <QAInterface resourceId={resourceId} />
            ) : (
              <div className="guide-content">
                <section className="guide-section">
                  <h2>How to Use the Academic Assistant</h2>

                  <div className="guide-item">
                    <h3>Step 1: Choose a Document</h3>
                    <p>
                      You can ask questions about any document in the system. If
                      you have a specific document in mind, navigate to it
                      first.
                    </p>
                  </div>

                  <div className="guide-item">
                    <h3>Step 2: Ask Your Question</h3>
                    <p>
                      Type a clear, specific question about the document
                      content. For example:
                    </p>
                    <ul className="example-questions">
                      <li>"Explain the normalization process in DBMS"</li>
                      <li>
                        "What are the key differences between OOP and procedural
                        programming?"
                      </li>
                      <li>
                        "Summarize the main points about networking protocols"
                      </li>
                    </ul>
                  </div>

                  <div className="guide-item">
                    <h3>Step 3: Get Instant Answers</h3>
                    <p>
                      The AI reads your document and generates accurate, cited
                      answers. Each answer shows the source documents and page
                      numbers for reference.
                    </p>
                  </div>

                  <div className="guide-item">
                    <h3>Tips for Best Results</h3>
                    <ul className="tips-list">
                      <li>Be specific in your questions</li>
                      <li>Use technical terms from your documents</li>
                      <li>Ask one question at a time</li>
                      <li>Keep your question under 500 characters</li>
                      <li>Check the sources to verify answers</li>
                    </ul>
                  </div>
                </section>

                <section className="guide-section">
                  <h2>Understanding the Results</h2>

                  <div className="guide-item">
                    <h3>Answer Quality</h3>
                    <p>
                      Answers are generated from your document content. If the
                      document doesn't contain relevant information, the system
                      will let you know.
                    </p>
                  </div>

                  <div className="guide-item">
                    <h3>What Sources Show</h3>
                    <ul className="tips-list">
                      <li>Document title</li>
                      <li>Page number where information was found</li>
                      <li>
                        Relevance score (how well it matches your question)
                      </li>
                      <li>A snippet of the relevant text</li>
                    </ul>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicAssistant;
