import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "@/services/auth";
import QAInterface from "@/components/QAInterface";
import { SERVER_BASE_URL } from "@/services/urlConfig";

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [textContent, setTextContent] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [editingTags, setEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${SERVER_BASE_URL}/api/v1/resources/${id}`);
        const data = await response.json();

        if (response.ok && data.data?.resource) {
          setResource(data.data.resource);
          setLikesCount(data.data.resource.likes || 0);
          setSummaryData(
            data.data.resource.summary
              ? { summary: data.data.resource.summary, keyPoints: [] }
              : null,
          );
          setTagDraft(
            (data.data.resource.tags || [])
              .map((tag) => tag.name || tag)
              .filter(Boolean)
              .join(", "),
          );

          authService
            .getCurrentUser()
            .then(async (firebaseUser) => {
              if (!firebaseUser) return;
              const token = await firebaseUser.getIdToken();
              return fetch(`${SERVER_BASE_URL}/api/v1/analytics/track`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: "view",
                  resourceId: id,
                  topicName: data.data.resource.subject,
                  metadata: {
                    subject: data.data.resource.subject,
                    category: data.data.resource.category,
                    semester: data.data.resource.semester,
                    department: data.data.resource.department,
                    deviceType: "web",
                  },
                }),
              });
            })
            .catch(() => {});

          if (data.data.resource.type === "txt") {
            try {
              const textResponse = await fetch(
                `${SERVER_BASE_URL}/api/v1/resources/${id}/view`,
              );
              const text = await textResponse.text();
              setTextContent(text);
            } catch (err) {
              console.error("Failed to load text content:", err);
            }
          }
        } else {
          toast.error(data.message || "Resource not found");
          navigate("/resources");
        }
      } catch (error) {
        console.error("Error fetching resource:", error);
        toast.error("Failed to load resource");
        navigate("/resources");
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id, navigate]);

  const handleLike = async () => {
    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        toast.error("Please login to like resources");
        navigate("/login");
        return;
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch(
        `${SERVER_BASE_URL}/api/v1/resources/${id}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (response.ok) {
        setLiked(!liked);
        setLikesCount(data.data?.liked ? likesCount + 1 : likesCount - 1);
        toast.success(data.data?.liked ? "Resource liked!" : "Resource unliked");
      } else {
        toast.error(data.message || "Failed to like resource");
      }
    } catch (error) {
      console.error("Error liking resource:", error);
      toast.error("Failed to like resource");
    }
  };

  const getAuthToken = async () => {
    const firebaseUser = await authService.getCurrentUser();
    if (!firebaseUser) {
      toast.error("Please login to continue");
      navigate("/login");
      return null;
    }
    return firebaseUser.getIdToken();
  };

  const handleGenerateSummary = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      setSummaryLoading(true);
      const response = await fetch(
        `${SERVER_BASE_URL}/api/v1/resources/${id}/generate-summary`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate summary");
      }

      setSummaryData(data.data || null);
      setResource((current) =>
        current ? { ...current, summary: data.data?.summary || current.summary } : current,
      );
      toast.success("Summary generated");
    } catch (error) {
      console.error("Generate summary error:", error);
      toast.error(error.message || "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSaveTags = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const tags = tagDraft
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((name) => ({ name, confidence: 1 }));

      const response = await fetch(`${SERVER_BASE_URL}/api/v1/resources/${id}/tags`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update tags");
      }

      setResource((current) =>
        current ? { ...current, tags: data.data?.tags || current.tags } : current,
      );
      setEditingTags(false);
      toast.success("Tags updated");
    } catch (error) {
      console.error("Update tags error:", error);
      toast.error(error.message || "Failed to update tags");
    }
  };

  const handleDownload = () => {
    authService
      .getCurrentUser()
      .then(async (firebaseUser) => {
        if (!firebaseUser) return;
        const token = await firebaseUser.getIdToken();
        return fetch(`${SERVER_BASE_URL}/api/v1/analytics/track`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "download",
            resourceId: id,
            topicName: resource?.subject,
            metadata: {
              subject: resource?.subject || null,
              category: resource?.category || null,
              semester: resource?.semester || null,
              department: resource?.department || null,
              deviceType: "web",
            },
          }),
        });
      })
      .catch(() => {});

    window.open(`${SERVER_BASE_URL}/api/v1/resources/${id}/download`, "_blank");
  };

  const handleOpen = () => {
    window.open(`/resources/${id}/view`, "_blank");
  };

  const canViewInline = () => {
    const nativeTypes = ["pdf", "image", "txt"];
    const officeTypes = ["doc", "docx", "pptx", "xls", "xlsx"];
    return (
      resource &&
      (nativeTypes.includes(resource.type) || officeTypes.includes(resource.type))
    );
  };

  const isOfficeType = () => {
    return resource && ["doc", "docx", "pptx", "xls", "xlsx"].includes(resource.type);
  };

  const canUseGoogleViewer = /^https?:\/\//i.test(SERVER_BASE_URL);
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(`${SERVER_BASE_URL}/api/v1/resources/${id}/view`)}&embedded=true`;

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFileIcon = (type) => {
    const icons = {
      pdf: "PDF",
      doc: "DOC",
      docx: "DOCX",
      pptx: "PPTX",
      txt: "TXT",
      image: "IMG",
    };
    return icons[type] || "FILE";
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-slate-500" />
          <p className="mt-4 text-slate-500">Loading resource...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  return (
    <div className="page-shell">
      <div className="container-max max-w-5xl">
        <Link
          to="/resources"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden="true">←</span>
          Back to Resources
        </Link>

        <div className="glass-lg overflow-hidden">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(217,222,228,0.92),rgba(247,248,249,0.96))] p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl border border-slate-300 bg-white/85 px-4 py-2 text-sm font-semibold tracking-[0.24em] text-slate-700">
                    {getFileIcon(resource.type)}
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {resource.category}
                  </span>
                </div>
                <h1 className="mb-3 text-4xl font-bold text-slate-900">
                  {resource.title}
                </h1>
                {resource.description && (
                  <p className="max-w-2xl text-base leading-7 text-slate-600">
                    {resource.description}
                  </p>
                )}
              </div>

              <div className="glass-sm min-w-[220px] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Uploaded By
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b96a6,#697586)] text-sm font-bold text-white">
                    {resource.uploadedByName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {resource.uploadedByName}
                    </p>
                    {resource.uploadedBy?.email && (
                      <p className="text-sm text-slate-500">
                        {resource.uploadedBy.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="glass-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Document Details
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Subject</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {resource.subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Department</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {resource.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Semester</p>
                    <p className="text-lg font-semibold text-slate-900">
                      Semester {resource.semester}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  File Information
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Academic Year</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {resource.academicYear}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">File Size</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatBytes(resource.fileSize)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Uploaded</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatDate(resource.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-8 grid gap-4 border-y border-slate-200 py-8 sm:grid-cols-2">
              <div className="glass-sm p-5">
                <p className="text-sm text-slate-500">Downloads</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {resource.downloads || 0}
                </p>
              </div>
              <div className="glass-sm p-5">
                <p className="text-sm text-slate-500">Likes</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {likesCount}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="glass-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      AI Summary
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Smart document overview
                    </h2>
                  </div>
                  <button onClick={handleGenerateSummary} className="btn-outline px-4 py-2 text-sm">
                    {summaryLoading ? "Generating..." : summaryData?.summary ? "Refresh Summary" : "Generate Summary"}
                  </button>
                </div>
                {summaryData?.summary || resource.summary ? (
                  <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      AI Generated Answer
                    </p>
                    <p className="mt-3 text-base leading-7 text-slate-700">
                      {summaryData?.summary || resource.summary}
                    </p>
                    {summaryData?.keyPoints?.length ? (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-900">Key points</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {summaryData.keyPoints.slice(0, 5).map((point, index) => (
                            <span
                              key={`point-${index}`}
                              className="rounded-full bg-white px-3 py-2 text-sm text-slate-700 border border-emerald-100"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-slate-600">
                    Generate a cached summary to make this resource easier to review.
                  </p>
                )}
              </div>

              <div className="glass-sm p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Tags
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      Improve discoverability
                    </h2>
                  </div>
                  <button
                    onClick={() => setEditingTags((current) => !current)}
                    className="btn-outline px-4 py-2 text-sm"
                  >
                    {editingTags ? "Cancel" : "Correct Tags"}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(resource.tags || []).map((tag, index) => (
                    <span
                      key={`tag-${index}`}
                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700"
                    >
                      {tag.name || tag}
                    </span>
                  ))}
                </div>

                {editingTags ? (
                  <div className="mt-4">
                    <textarea
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none"
                      placeholder="Enter comma-separated tags"
                    />
                    <button onClick={handleSaveTags} className="btn-primary mt-3 px-4 py-2 text-sm">
                      Save Tags
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleOpen}
                className="btn-primary flex-1"
              >
                Open File
              </button>
              <button
                onClick={handleDownload}
                className="btn-outline flex-1"
              >
                Download File
              </button>
              <button
                onClick={handleLike}
                className="btn-secondary"
              >
                {liked ? "Liked" : "Like"}
              </button>
            </div>
          </div>
        </div>

        {canViewInline() && (
          <div className="glass-lg mt-8 p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">File Preview</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Open, inspect, or expand the resource directly in-browser.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleOpen}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Open in New Tab
                </button>
                {resource.type === "pdf" && (
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="btn-outline px-4 py-2 text-sm"
                  >
                    {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                )}
              </div>
            </div>

            <div
              className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white ${fullscreen ? "fixed inset-4 z-50 p-4" : ""}`}
            >
              {resource.type === "image" ? (
                <div className="flex justify-center bg-slate-50 p-4">
                  <img
                    src={`${SERVER_BASE_URL}/api/v1/resources/${id}/view`}
                    alt={resource.title}
                    className="max-w-full rounded-2xl"
                    style={{
                      maxHeight: fullscreen ? "calc(100vh - 8rem)" : "600px",
                    }}
                  />
                </div>
              ) : resource.type === "pdf" ? (
                <div
                  style={{
                    height: fullscreen ? "calc(100vh - 8rem)" : "600px",
                  }}
                >
                  <iframe
                    src={`${SERVER_BASE_URL}/api/v1/resources/${id}/view`}
                    className="h-full w-full"
                    title={resource.title}
                    style={{ border: "none" }}
                  />
                </div>
              ) : resource.type === "txt" && textContent ? (
                <div className="max-h-[600px] overflow-auto bg-white p-6">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700">
                    {textContent}
                  </pre>
                </div>
              ) : resource.type === "txt" ? (
                <div className="py-8 text-center text-slate-500">
                  Loading text content...
                </div>
              ) : isOfficeType() ? (
                canUseGoogleViewer ? (
                  <div
                    style={{
                      height: fullscreen ? "calc(100vh - 8rem)" : "600px",
                    }}
                  >
                    <iframe
                      src={googleViewerUrl}
                      className="h-full w-full"
                      title={resource.title}
                      style={{ border: "none" }}
                    />
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <div className="mb-4 text-sm font-semibold uppercase tracking-[0.26em] text-slate-500">
                      Office Preview Unavailable
                    </div>
                    <p className="mx-auto mb-6 max-w-xl text-slate-600">
                      Office files need a publicly reachable document URL for
                      embedded preview. Download the file or open it through
                      your deployed frontend URL for full in-browser preview.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={handleDownload} className="btn-primary px-4 py-2 text-sm">
                        Download
                      </button>
                      <a
                        href={googleViewerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline px-4 py-2 text-sm"
                      >
                        Try Google Docs Viewer
                      </a>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}

        {resource && !canViewInline() && (
          <div className="glass-lg mt-8 p-8">
            <div className="py-8 text-center">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                Preview Not Available
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                Download required for this file type
              </h3>
              <p className="mx-auto mb-6 max-w-xl text-slate-600">
                This file type ({resource.type.toUpperCase()}) cannot be previewed
                directly in the browser yet. Download it to view the full content.
              </p>
              <button onClick={handleDownload} className="btn-primary">
                Download to View
              </button>
            </div>
          </div>
        )}

        <div className="glass-lg mt-8 p-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Ask AI
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Grounded Q&A with citations
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ask about this resource and review confidence, timing, and chunk-level sources.
            </p>
          </div>
          <QAInterface resourceId={id} />
        </div>
      </div>
    </div>
  );
}
