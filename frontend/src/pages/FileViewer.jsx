import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import JSZip from "jszip";
import mammoth from "mammoth";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const SERVER_BASE_URL = API_ROOT.replace(/\/api\/v1\/?$/, "");

const decodeXmlEntities = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const extractPptxSlides = async (arrayBuffer) => {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => {
      const leftIndex = Number(left.match(/slide(\d+)/)?.[1] || 0);
      const rightIndex = Number(right.match(/slide(\d+)/)?.[1] || 0);
      return leftIndex - rightIndex;
    });

  const slides = await Promise.all(
    slideEntries.map(async (entry, index) => {
      const xml = await zip.file(entry).async("text");
      const textMatches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      const content = textMatches
        .map((match) => decodeXmlEntities(match[1]))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        id: entry,
        title: `Slide ${index + 1}`,
        content: content || "No readable text found on this slide.",
      };
    }),
  );

  return slides;
};

export default function FileViewerPage() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  const [docxHtml, setDocxHtml] = useState("");
  const [pptxSlides, setPptxSlides] = useState([]);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await fetch(`${SERVER_BASE_URL}/api/v1/resources/${id}`);
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

  const fileExt = useMemo(
    () => resource?.fileName?.split(".").pop()?.toLowerCase() || "",
    [resource],
  );
  const viewUrl = `${SERVER_BASE_URL}/api/v1/resources/${id}/view`;
  const downloadUrl = `${SERVER_BASE_URL}/api/v1/resources/${id}/download`;
  const canDisplayInline = ["pdf", "jpg", "jpeg", "png", "gif", "webp", "txt"].includes(fileExt);
  const supportsClientPreview = ["docx", "pptx"].includes(fileExt);
  const canPreview = canDisplayInline || supportsClientPreview;

  useEffect(() => {
    const loadOfficePreview = async () => {
      if (!resource || !supportsClientPreview) {
        return;
      }

      try {
        setPreviewLoading(true);
        setViewerError(null);

        const response = await fetch(viewUrl);
        if (!response.ok) {
          throw new Error("Failed to load source file");
        }

        const arrayBuffer = await response.arrayBuffer();

        if (fileExt === "docx") {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value || "<p>No readable content found.</p>");
          setPptxSlides([]);
        } else if (fileExt === "pptx") {
          const slides = await extractPptxSlides(arrayBuffer);
          setPptxSlides(slides);
          setDocxHtml("");
        }
      } catch (error) {
        console.error("Preview load failed:", error);
        setViewerError(
          error.message || "This file could not be previewed in the browser.",
        );
      } finally {
        setPreviewLoading(false);
      }
    };

    void loadOfficePreview();
  }, [resource, supportsClientPreview, fileExt, viewUrl]);

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-slate-500" />
          <p className="mt-4 text-sm uppercase tracking-[0.25em] text-slate-500">
            Loading viewer
          </p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="glass-lg max-w-lg p-10 text-center">
          <p className="text-xl font-semibold text-slate-900">Resource not found</p>
          <Link to="/resources" className="btn-outline mt-4 inline-flex">
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container-max max-w-7xl">
        <div className="glass-lg overflow-hidden">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(216,221,227,0.88),rgba(247,248,249,0.96))]">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  to={`/resources/${id}`}
                  className="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-900"
                >
                  Back to resource
                </Link>
                <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                  {resource.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  View course material in-browser with a clean reading layout for
                  desktop and mobile. This viewer is intentionally focused on the
                  document only.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Open Raw File
                </a>
                <a
                  href={downloadUrl}
                  download
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Download
                </a>
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)]">
            <aside className="glass-sm p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Document Brief
              </p>
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Type</p>
                  <p className="mt-1 font-semibold">{fileExt.toUpperCase() || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Category</p>
                  <p className="mt-1 font-semibold">{resource.category}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Subject</p>
                  <p className="mt-1 font-semibold">{resource.subject}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Uploaded By</p>
                  <p className="mt-1 font-semibold">{resource.uploadedByName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Description</p>
                  <p className="mt-1 leading-6 text-slate-600">
                    {resource.description || "No description provided for this file yet."}
                  </p>
                </div>
              </div>
            </aside>

            <section className="glass-sm p-4 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    File Preview
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {canPreview
                      ? "Previewing the file directly in-browser."
                      : "This file type still needs to be downloaded to view fully."}
                  </p>
                </div>
                <div className="rounded-full border border-slate-300 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-700">
                  {canPreview ? "Viewer Ready" : "Download Only"}
                </div>
              </div>

              {viewerError ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                  <p className="text-lg font-semibold">Preview unavailable</p>
                  <p className="mt-2 text-sm text-amber-800">{viewerError}</p>
                </div>
              ) : canDisplayInline ? (
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                  {fileExt === "pdf" ? (
                    <iframe
                      src={viewUrl}
                      className="w-full"
                      style={{ height: "78vh", border: "none" }}
                      title={resource.title}
                    />
                  ) : fileExt === "txt" ? (
                    <iframe
                      src={viewUrl}
                      className="w-full"
                      style={{ height: "78vh", border: "none", background: "#fff" }}
                      title={resource.title}
                    />
                  ) : (
                    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-4">
                      <img
                        src={viewUrl}
                        alt={resource.title}
                        className="max-h-[70vh] max-w-full rounded-2xl object-contain"
                      />
                    </div>
                  )}
                </div>
              ) : supportsClientPreview ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-8">
                  {previewLoading ? (
                    <div className="flex min-h-[50vh] items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-slate-500" />
                        <p className="mt-4 text-sm uppercase tracking-[0.25em] text-slate-500">
                          Building preview
                        </p>
                      </div>
                    </div>
                  ) : fileExt === "docx" ? (
                    <article className="prose max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900">
                      <div dangerouslySetInnerHTML={{ __html: docxHtml }} />
                    </article>
                  ) : (
                    <div className="space-y-4">
                      {pptxSlides.map((slide) => (
                        <div
                          key={slide.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            {slide.title}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            {slide.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center">
                  <p className="text-2xl font-semibold text-slate-900">Download required</p>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    This viewer currently supports PDF, images, text, DOCX, and
                    PPTX previews. For this format, use the download button for the
                    best experience.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
