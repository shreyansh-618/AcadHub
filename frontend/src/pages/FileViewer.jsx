import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function FileViewerPage() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/resources/${id}`);
        const data = await response.json();

        if (response.ok && data.data?.resource) {
          setResource(data.data.resource);
        } else {
          toast.error('Resource not found');
        }
      } catch (error) {
        console.error('Error fetching resource:', error);
        toast.error('Failed to load resource');
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

  const fileExt = resource.fileName.split('.').pop().toLowerCase();
  const viewUrl = `${API_BASE_URL}/api/v1/resources/${id}/view`;

  // Files that browsers can display natively
  const canDisplayInline = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'].includes(fileExt);

  // Office files - use Microsoft Office Online viewer (requires public URL)
  // For localhost, we'll try to display or show download option
  const isOfficeFile = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-semibold truncate">{resource.title}</h1>
          <a
            href={`${API_BASE_URL}/api/v1/resources/${id}/download`}
            download
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Download
          </a>
        </div>
      </div>

      {/* File Display */}
      <div className="max-w-7xl mx-auto p-4">
        {canDisplayInline ? (
          <div className="bg-white rounded-lg overflow-hidden" style={{ minHeight: 'calc(100vh - 120px)' }}>
            {fileExt === 'pdf' ? (
              <iframe
                src={viewUrl}
                className="w-full"
                style={{ height: 'calc(100vh - 120px)', border: 'none' }}
                title={resource.title}
              />
            ) : fileExt === 'txt' ? (
              <div className="p-8">
                <iframe
                  src={viewUrl}
                  className="w-full"
                  style={{ height: 'calc(100vh - 200px)', border: 'none' }}
                  title={resource.title}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-8" style={{ minHeight: 'calc(100vh - 120px)' }}>
                <img
                  src={viewUrl}
                  alt={resource.title}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                />
              </div>
            )}
          </div>
        ) : isOfficeFile ? (
          <div className="bg-slate-800 rounded-lg p-8 mt-8 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-white mb-4">Office File Viewer</h2>
            <p className="text-slate-400 mb-6">
              Office files ({fileExt.toUpperCase()}) cannot be displayed directly in the browser.
              Please download the file to view it.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href={`${API_BASE_URL}/api/v1/resources/${id}/download`}
                download
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                Download File
              </a>
              {/* Try to open with Office Online if file is publicly accessible */}
              <a
                href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
              >
                Try Office Online Viewer
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 mt-8 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-white mb-4">File Viewer</h2>
            <p className="text-slate-400 mb-6">
              This file type cannot be displayed in the browser. Please download it to view.
            </p>
            <a
              href={`${API_BASE_URL}/api/v1/resources/${id}/download`}
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
