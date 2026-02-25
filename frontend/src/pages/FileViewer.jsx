import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function FileViewerPage() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerError, setViewerError] = useState(false);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/resources/${id}`);
        const data = await response.json();

        if (response.ok && data.data?.resource) {
          setResource(data.data.resource);
        } else {
          toast.error("Resource not found");
        }
      } catch (error) {
        console.error("Error fetching resource:", error);
        toast.error("Failed to load resource");
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>Resource not found</p>
        </div>
      </div>
    );
  }

  const fileExt = resource.fileName.split(".").pop().toLowerCase();
  const viewUrl = `${API_BASE_URL}/api/v1/resources/${id}/view`;
  const downloadUrl = `${API_BASE_URL}/api/v1/resources/${id}/download`;

  // Files that browsers can display natively
  const canDisplayInline = [
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "txt",
  ].includes(fileExt);

  // Office files — use Google Docs Viewer (like Google Classroom)
  const isOfficeFile = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(
    fileExt,
  );

  // Check if the app is running on localhost (Google Docs Viewer needs a public URL)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // Google Docs Viewer URL — works when the file URL is publicly accessible
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(viewUrl)}&embedded=true`;

  const getFileTypeLabel = (ext) => {
    const labels = {
      doc: "Word Document",
      docx: "Word Document",
      ppt: "PowerPoint Presentation",
      pptx: "PowerPoint Presentation",
      xls: "Excel Spreadsheet",
      xlsx: "Excel Spreadsheet",
    };
    return labels[ext] || ext.toUpperCase();
  };

  const getFileIcon = (ext) => {
    const icons = {
      doc: "📝",
      docx: "📝",
      ppt: "📊",
      pptx: "📊",
      xls: "📈",
      xlsx: "📈",
    };
    return icons[ext] || "📄";
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-semibold truncate">
            {resource.title}
          </h1>
          <div className="flex items-center gap-3">
            {isOfficeFile && !isLocalhost && !viewerError && (
              <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                Powered by Google Docs Viewer
              </span>
            )}
            <a
              href={downloadUrl}
              download
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      </div>

      {/* File Display */}
      <div className="max-w-7xl mx-auto p-4">
        {canDisplayInline ? (
          <div
            className="bg-white rounded-lg overflow-hidden"
            style={{ minHeight: "calc(100vh - 120px)" }}
          >
            {fileExt === "pdf" ? (
              <iframe
                src={viewUrl}
                className="w-full"
                style={{ height: "calc(100vh - 120px)", border: "none" }}
                title={resource.title}
              />
            ) : fileExt === "txt" ? (
              <div className="p-8">
                <iframe
                  src={viewUrl}
                  className="w-full"
                  style={{ height: "calc(100vh - 200px)", border: "none" }}
                  title={resource.title}
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-center p-8"
                style={{ minHeight: "calc(100vh - 120px)" }}
              >
                <img
                  src={viewUrl}
                  alt={resource.title}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: "calc(100vh - 200px)" }}
                />
              </div>
            )}
          </div>
        ) : isOfficeFile ? (
          <>
            {/* Try Google Docs Viewer for Office files (works with public URLs) */}
            {!isLocalhost && !viewerError ? (
              <div
                className="bg-white rounded-lg overflow-hidden"
                style={{ minHeight: "calc(100vh - 120px)" }}
              >
                <iframe
                  src={googleViewerUrl}
                  className="w-full"
                  style={{ height: "calc(100vh - 120px)", border: "none" }}
                  title={resource.title}
                  onError={() => setViewerError(true)}
                />
              </div>
            ) : (
              /* Localhost or viewer error fallback */
              <div className="bg-slate-800 rounded-lg p-12 mt-8 text-center max-w-2xl mx-auto">
                <div className="text-7xl mb-6">{getFileIcon(fileExt)}</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {getFileTypeLabel(fileExt)}
                </h2>
                <p className="text-slate-300 text-lg mb-2">
                  {resource.fileName}
                </p>
                <p className="text-slate-400 mb-8">
                  {isLocalhost
                    ? "Office files cannot be previewed on localhost. Please download the file to view it, or deploy the app to enable in-browser viewing via Google Docs Viewer."
                    : "The viewer could not load this file. Please download it to view."}
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <a
                    href={downloadUrl}
                    download
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center gap-2"
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
                  </a>
                  {isLocalhost && (
                    <a
                      href={googleViewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 inline-flex items-center gap-2"
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
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Try Google Docs Viewer
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 mt-8 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-white mb-4">File Viewer</h2>
            <p className="text-slate-400 mb-6">
              This file type cannot be displayed in the browser. Please download
              it to view.
            </p>
            <a
              href={downloadUrl}
              download
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors inline-block"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
