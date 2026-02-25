import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "@/services/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [textContent, setTextContent] = useState(null);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/resources/${id}`);
        const data = await response.json();

        if (response.ok && data.data?.resource) {
          setResource(data.data.resource);
          setLikesCount(data.data.resource.likes || 0);

          // Load text files content for inline viewing
          if (data.data.resource.type === "txt") {
            try {
              const textResponse = await fetch(
                `${API_BASE_URL}/api/v1/resources/${id}/view`,
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
        `${API_BASE_URL}/api/v1/resources/${id}/like`,
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
        toast.success(
          data.data?.liked ? "Resource liked!" : "Resource unliked",
        );
      } else {
        toast.error(data.message || "Failed to like resource");
      }
    } catch (error) {
      console.error("Error liking resource:", error);
      toast.error("Failed to like resource");
    }
  };

  const handleDownload = () => {
    window.open(`${API_BASE_URL}/api/v1/resources/${id}/download`, "_blank");
  };

  const handleOpen = () => {
    // Navigate to dedicated viewer page
    window.open(`/resources/${id}/view`, "_blank");
  };

  const canViewInline = () => {
    // Show preview for files that browsers can display natively or via Google Docs Viewer
    const nativeTypes = ["pdf", "image", "txt"];
    const officeTypes = ["doc", "docx", "pptx", "xls", "xlsx"];
    return (
      resource &&
      (nativeTypes.includes(resource.type) ||
        officeTypes.includes(resource.type))
    );
  };

  const isOfficeType = () => {
    return (
      resource && ["doc", "docx", "pptx", "xls", "xlsx"].includes(resource.type)
    );
  };

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(`${API_BASE_URL}/api/v1/resources/${id}/view`)}&embedded=true`;

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
      pdf: "📄",
      doc: "📝",
      docx: "📝",
      pptx: "📊",
      txt: "📃",
      image: "🖼️",
    };
    return icons[type] || "📄";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading resource...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4">
      <div className="container-max max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Resources
        </Link>

        {/* Resource Card */}
        <div className="glass-lg rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{getFileIcon(resource.type)}</span>
                  <span className="text-xs font-semibold text-white bg-black bg-opacity-30 px-3 py-1 rounded-full">
                    {resource.category}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {resource.title}
                </h1>
                {resource.description && (
                  <p className="text-blue-100 text-lg">
                    {resource.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">
                    Subject
                  </label>
                  <p className="text-white text-lg">{resource.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">
                    Department
                  </label>
                  <p className="text-white text-lg">{resource.department}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">
                    Semester
                  </label>
                  <p className="text-white text-lg">
                    Semester {resource.semester}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">
                    Academic Year
                  </label>
                  <p className="text-white text-lg">{resource.academicYear}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">
                    File Size
                  </label>
                  <p className="text-white text-lg">
                    {formatBytes(resource.fileSize)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-400 block mb-1">
                    Uploaded
                  </label>
                  <p className="text-white text-lg">
                    {formatDate(resource.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Uploader Info */}
            <div className="bg-slate-700 rounded-lg p-4 mb-8">
              <label className="text-sm font-semibold text-slate-400 block mb-2">
                Uploaded By
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                  {resource.uploadedByName?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {resource.uploadedByName}
                  </p>
                  {resource.uploadedBy?.email && (
                    <p className="text-slate-400 text-sm">
                      {resource.uploadedBy.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
                <div>
                  <p className="text-slate-400 text-sm">Downloads</p>
                  <p className="text-white text-xl font-bold">
                    {resource.downloads || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">❤️</span>
                <div>
                  <p className="text-slate-400 text-sm">Likes</p>
                  <p className="text-white text-xl font-bold">{likesCount}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleOpen}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Open File
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download File
              </button>
              <button
                onClick={handleLike}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {liked ? "Liked" : "Like"}
              </button>
            </div>
          </div>
        </div>

        {/* File Preview Section - Always show for viewable files */}
        {canViewInline() && (
          <div className="glass-lg rounded-2xl p-8 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">File Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleOpen}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  title="Open in new tab"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Open in New Tab
                </button>
                {resource.type === "pdf" && (
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                    title="Toggle fullscreen"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                      />
                    </svg>
                    {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                )}
              </div>
            </div>
            <div
              className={`bg-slate-800 rounded-lg p-4 ${fullscreen ? "fixed inset-4 z-50" : ""}`}
            >
              {resource.type === "image" ? (
                <div className="flex justify-center">
                  <img
                    src={`${API_BASE_URL}/api/v1/resources/${id}/view`}
                    alt={resource.title}
                    className="max-w-full h-auto rounded-lg"
                    style={{
                      maxHeight: fullscreen ? "calc(100vh - 8rem)" : "600px",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      const errorDiv = document.createElement("div");
                      errorDiv.className = "text-slate-400 text-center py-8";
                      errorDiv.textContent = "Preview not available";
                      e.target.parentElement.appendChild(errorDiv);
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
                    src={`${API_BASE_URL}/api/v1/resources/${id}/view`}
                    className="w-full h-full rounded-lg"
                    title={resource.title}
                    style={{ border: "none" }}
                  />
                </div>
              ) : resource.type === "txt" && textContent ? (
                <div className="bg-slate-900 rounded-lg p-6 max-h-[600px] overflow-auto">
                  <pre className="text-slate-200 whitespace-pre-wrap font-mono text-sm">
                    {textContent}
                  </pre>
                </div>
              ) : resource.type === "txt" ? (
                <div className="text-slate-400 text-center py-8">
                  Loading text content...
                </div>
              ) : isOfficeType() ? (
                !isLocalhost ? (
                  <div
                    style={{
                      height: fullscreen ? "calc(100vh - 8rem)" : "600px",
                    }}
                  >
                    <iframe
                      src={googleViewerUrl}
                      className="w-full h-full rounded-lg"
                      title={resource.title}
                      style={{ border: "none" }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">
                      {getFileIcon(resource.type)}
                    </div>
                    <p className="text-slate-400 mb-4">
                      Office files cannot be previewed on localhost. Download
                      the file or deploy the app for in-browser viewing.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Download
                      </button>
                      <a
                        href={googleViewerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors"
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

        {/* Non-viewable files message */}
        {resource && !canViewInline() && (
          <div className="glass-lg rounded-2xl p-8 mt-8">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">{getFileIcon(resource.type)}</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Preview Not Available
              </h3>
              <p className="text-slate-400 mb-6">
                This file type ({resource.type.toUpperCase()}) cannot be
                previewed in the browser. Please download the file to view it.
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download to View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
