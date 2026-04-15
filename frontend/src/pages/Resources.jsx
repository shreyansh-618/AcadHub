import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import UploadDocumentModal from '@/components/UploadDocumentModal';
import { API_ROOT } from '@/services/urlConfig';

const STATUS_STYLES = {
  indexed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  processing: 'border-amber-200 bg-amber-50 text-amber-700',
  pending_embedding: 'border-orange-200 bg-orange-50 text-orange-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  pending: 'border-slate-200 bg-slate-100 text-slate-700',
};

const getProcessingStatusMeta = (status) => {
  switch (status) {
    case 'indexed':
      return { label: 'Indexed', className: STATUS_STYLES.indexed };
    case 'processing':
      return { label: 'Processing', className: STATUS_STYLES.processing };
    case 'pending_embedding':
      return { label: 'Retrying Embedding', className: STATUS_STYLES.pending_embedding };
    case 'failed':
      return { label: 'Index Failed', className: STATUS_STYLES.failed };
    default:
      return { label: 'Pending', className: STATUS_STYLES.pending };
  }
};

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filter, setFilter] = useState({
    category: 'all',
    subject: 'all',
    page: 1,
    limit: 12,
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'lecture-notes', label: 'Lecture Notes' },
    { value: 'textbooks', label: 'Textbooks' },
    { value: 'question-papers', label: 'Question Papers' },
    { value: 'assignments', label: 'Assignments' },
    { value: 'other', label: 'Other' },
  ];

  const subjects = [
    { value: 'all', label: 'All Subjects' },
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'Physics', label: 'Physics' },
    { value: 'Chemistry', label: 'Chemistry' },
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Data Structures', label: 'Data Structures' },
    { value: 'Algorithms', label: 'Algorithms' },
    { value: 'Web Development', label: 'Web Development' },
    { value: 'Database Management', label: 'Database Management' },
  ];

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        let url = `${API_ROOT}/resources?page=${filter.page}&limit=${filter.limit}`;
        if (filter.category !== 'all') url += `&category=${filter.category}`;
        if (filter.subject !== 'all') url += `&subject=${filter.subject}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data.resources) {
          setResources(data.data.resources);
        }
      } catch (error) {
        console.error('Error fetching resources:', error);
        toast.error('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [filter]);

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    setFilter({ ...filter, page: 1 });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="page-shell">
      <div className="container-max">
        {/* Header */}
        <div className="glass-panel mb-8 flex flex-col items-start justify-between gap-4 p-8 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              Resources Library
            </h1>
            <p className="text-slate-600 text-sm md:text-base">
              Browse and share academic resources with your peers
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary whitespace-nowrap w-full sm:w-auto"
          >
            + Upload Resource
          </button>
        </div>

        {/* Filters */}
        <div className="glass mb-8 grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Category
            </label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value, page: 1 })}
              className="input-field w-full"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Subject
            </label>
            <select
              value={filter.subject}
              onChange={(e) => setFilter({ ...filter, subject: e.target.value, page: 1 })}
              className="input-field w-full"
            >
              {subjects.map((sub) => (
                <option key={sub.value} value={sub.value}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          {/* Items Per Page */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Items Per Page
            </label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter({ ...filter, limit: parseInt(e.target.value), page: 1 })}
              className="input-field w-full"
            >
              <option value="6">6</option>
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
            </select>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-slate-400">Loading resources...</div>
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {resources.map((resource) => {
              const statusMeta = getProcessingStatusMeta(resource.processingStatus);

              return (
                <div
                  key={resource._id}
                  className="group overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/75 shadow-[0_18px_50px_rgba(91,101,118,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(91,101,118,0.14)]"
                >
                  <div className="bg-[linear-gradient(135deg,rgba(208,214,222,0.95),rgba(236,239,242,0.92))] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-slate-300/80 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700">
                        {resource.category}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-slate-700">
                      {resource.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-sm text-slate-600">
                      {resource.description || 'No description provided'}
                    </p>

                    <div className="mb-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Subject:</span>
                        <span className="text-slate-700">{resource.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uploaded by:</span>
                        <span className="truncate text-slate-700">{resource.uploadedByName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span className="text-slate-700">{formatBytes(resource.fileSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="text-slate-700">{formatDate(resource.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`${API_ROOT}/resources/${resource._id}/download`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm py-2 flex-1 text-center"
                      >
                        Download
                      </a>
                      <Link
                        to={`/resources/${resource._id}`}
                        className="btn-secondary text-sm py-2 flex-1 text-center"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-600 text-lg mb-4">No resources found</div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary"
            >
              Be the first to upload
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
