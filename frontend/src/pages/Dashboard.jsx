import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';
import UploadDocumentModal from '@/components/UploadDocumentModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const firebaseUser = await authService.getCurrentUser();

        if (!firebaseUser) {
          navigate('/login');
          return;
        }

        const token = await firebaseUser.getIdToken();

        // Fetch user profile with retry logic
        let profileData = null;
        let retries = 3;
        while (retries > 0) {
          try {
            const profileRes = await fetch('/api/v1/users/profile', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (profileRes.ok) {
              const data = await profileRes.json();
              profileData = data.data?.user || data;
              setUser(profileData);
              break;
            } else if (profileRes.status === 404 && retries > 1) {
              // User profile might not exist yet, retry after delay
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
            } else {
              break;
            }
          } catch (error) {
            if (retries > 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
            } else {
              throw error;
            }
          }
        }

        // Fetch documents
        const docsRes = await fetch('/api/v1/resources', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.data?.resources || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleUploadSuccess = async () => {
    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) return;

      const token = await firebaseUser.getIdToken();
      const docsRes = await fetch('/api/v1/resources', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.data?.resources || []);
      }
    } catch (error) {
      console.error('Error refreshing documents:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="glass-lg p-8 rounded-2xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user?.name || 'User'}!
              </h1>
              <p className="text-slate-400">
                Manage your academic resources and connect with peers
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                📤 Upload Document
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-lg p-6 rounded-lg">
            <div className="text-3xl font-bold text-blue-400 mb-2">0</div>
            <p className="text-slate-400">Documents Uploaded</p>
          </div>
          <div className="glass-lg p-6 rounded-lg">
            <div className="text-3xl font-bold text-purple-400 mb-2">0</div>
            <p className="text-slate-400">Documents Liked</p>
          </div>
          <div className="glass-lg p-6 rounded-lg">
            <div className="text-3xl font-bold text-pink-400 mb-2">0</div>
            <p className="text-slate-400">Discussion Posts</p>
          </div>
        </div>

        {/* Documents Section */}
        <div className="glass-lg rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Latest Documents</h2>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">No documents uploaded yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-slate-700 p-6 rounded-lg hover:bg-slate-600 transition-all transform hover:scale-105"
                >
                  <div className="mb-4">
                    <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {doc.description || 'No description'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-500 bg-opacity-30 text-blue-300 rounded-full text-xs font-semibold">
                      {doc.category}
                    </span>
                    <span className="px-3 py-1 bg-purple-500 bg-opacity-30 text-purple-300 rounded-full text-xs font-semibold">
                      {doc.subject}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-slate-400 mb-4">
                    <span>📥 {doc.downloads} downloads</span>
                    <span>❤️ {doc.likes} likes</span>
                  </div>

                  <div className="flex gap-2">
                    <a 
                      href={`/resources/${doc._id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors inline-block text-center text-sm"
                      title="Open file in new tab"
                    >
                      Open
                    </a>
                    <a 
                      href={`http://localhost:3000/api/v1/resources/${doc._id}/download`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors inline-block text-center text-sm"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/discussions')}
            className="glass-lg p-6 rounded-lg text-left hover:bg-slate-700 transition-colors group"
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              Discussions
            </h3>
            <p className="text-slate-400 mt-2">
              Join discussions with fellow students and faculty
            </p>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="glass-lg p-6 rounded-lg text-left hover:bg-slate-700 transition-colors group"
          >
            <div className="text-4xl mb-3">👤</div>
            <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
              My Profile
            </h3>
            <p className="text-slate-400 mt-2">
              View and manage your profile, uploads, and favorites
            </p>
          </button>
        </div>
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

