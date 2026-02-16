import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function UploadDocumentModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'lecture-notes',
    subject: '',
    semester: '1',
    academicYear: new Date().getFullYear().toString(),
  });

  const categories = [
    'lecture-notes',
    'textbooks',
    'question-papers',
    'assignments',
    'other',
  ];

  const subjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Computer Science',
    'Data Structures',
    'Algorithms',
    'Web Development',
    'Database Management',
    'Operating Systems',
    'Other',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.subject.trim()) {
      toast.error('Please select a subject');
      return;
    }

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setLoading(true);

    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        toast.error('You must be logged in to upload');
        return;
      }

      const token = await firebaseUser.getIdToken();

      // Create FormData for file upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('subject', formData.subject);
      uploadFormData.append('semester', formData.semester);
      uploadFormData.append('academicYear', formData.academicYear);
      uploadFormData.append('fileSize', file.size);

      const res = await fetch(`${API_BASE_URL}/api/v1/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Document uploaded successfully!');
        setFile(null);
        setFormData({
          title: '',
          description: '',
          category: 'lecture-notes',
          subject: '',
          semester: '1',
          academicYear: new Date().getFullYear().toString(),
        });
        if (onSuccess) {
          onSuccess();
        }
        if (onClose) {
          onClose();
        }
      } else {
        toast.error(data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Document Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., Lecture Notes - Chapter 5"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Brief description of the document"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Subject *
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Semester *
            </label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem.toString()}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Academic Year *
            </label>
            <input
              type="text"
              name="academicYear"
              value={formData.academicYear}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., 2024-2025"
            />
          </div>

          {/* File Input */}
          <div>
            <label className="block text-slate-200 text-sm font-semibold mb-2">
              Select File *
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 file:mr-4 file:bg-blue-500 file:text-white file:border-0 file:rounded file:cursor-pointer"
                accept=".pdf,.doc,.docx,.pptx,.txt,.xls,.xlsx"
              />
              <p className="text-xs text-slate-400 mt-1">
                Max 50MB. Supported: PDF, DOC, DOCX, PPTX, TXT, XLS, XLSX
              </p>
            </div>
            {file && (
              <p className="text-sm text-green-400 mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
