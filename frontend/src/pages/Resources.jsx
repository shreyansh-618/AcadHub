import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import UploadDocumentModal from '@/components/UploadDocumentModal';

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
        let url = `http://localhost:3000/api/v1/resources?page=${filter.page}&limit=${filter.limit}`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-12 px-4">
      <div className="container-max">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              Resources Library
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {resources.map((resource) => (
              <div
                key={resource._id}
                className="group bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-blue-500/20"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                  <span className="text-xs font-semibold text-white bg-black bg-opacity-30 px-2 py-1 rounded">
                    {resource.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                    {resource.description || 'No description provided'}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-slate-400 mb-4 border-t border-slate-700 pt-3">
                    <div className="flex justify-between">
                      <span>Subject:</span>
                      <span className="text-slate-200">{resource.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded by:</span>
                      <span className="text-slate-200 truncate">{resource.uploadedByName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="text-slate-200">{formatBytes(resource.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="text-slate-200">{formatDate(resource.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={`/resources/${resource._id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm py-2 flex-1 text-center bg-green-600 hover:bg-green-700"
                      title="Open file in new tab"
                    >
                      Open
                    </a>
                    <a
                      href={`http://localhost:3000/api/v1/resources/${resource._id}/download`}
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
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg mb-4">No resources found</div>
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
