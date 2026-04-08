import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';
import UploadDocumentModal from '@/components/UploadDocumentModal';
import { apiClient } from '@/services/api';
import { API_ROOT } from '@/services/urlConfig';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [stats, setStats] = useState({ resources: 0, questions: 0, searches: 0 });
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

        let docsCount = 0;
        // Fetch documents
        const docsRes = await fetch('/api/v1/resources', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const docs = docsData.data?.resources || [];
          setDocuments(docs);
          docsCount = docs.length;
        }

        const [recommendationsRes, trendingRes, statsRes] = await Promise.allSettled([
          apiClient.get('/recommendations/for-you?limit=6'),
          apiClient.get('/recommendations/trending?limit=6'),
          apiClient.get('/analytics/user-stats'),
        ]);

        if (recommendationsRes.status === 'fulfilled') {
          setRecommendations(recommendationsRes.value.data?.recommendations || []);
        }
        if (trendingRes.status === 'fulfilled') {
          setTrending(trendingRes.value.data?.trending || []);
        }
        if (statsRes.status === 'fulfilled') {
          const byType = statsRes.value.data?.stats?.byType || [];
          const counters = byType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {});
          setStats({
            resources: docsCount,
            questions: counters.qa_asked || 0,
            searches: counters.search || 0,
          });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Welcome back, {user?.name || 'User'}!
              </h1>
              <p className="text-slate-600">
                Manage your academic resources and connect with peers
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md"
              >
                📤 Upload Document
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">{documents.length}</div>
            <p className="text-slate-600">Documents Uploaded</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.searches}</div>
            <p className="text-slate-600">Searches (30 days)</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-lg">
            <div className="text-3xl font-bold text-pink-600 mb-2">{stats.questions}</div>
            <p className="text-slate-600">Questions Asked</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 mb-8">
          <div className="flex flex-col gap-2 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
            <p className="text-slate-600">Based on your activity, searches, and the subjects you keep returning to.</p>
          </div>
          {recommendations.length === 0 ? (
            <p className="text-slate-600">No recommendations yet. Start exploring resources.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((item) => (
                <button
                  key={item._id}
                  onClick={() => navigate(`/resources/${item._id}`)}
                  className="text-left bg-slate-50 border border-slate-200 p-4 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Recommended for You
                    </span>
                    <span className="text-xs text-slate-500">
                      Match {(Number(item.score || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-slate-900 font-semibold line-clamp-2">{item.title}</p>
                  <p className="text-slate-600 text-sm mt-2 line-clamp-2">{item.reason}</p>
                  {item.summary ? (
                    <p className="text-slate-500 text-sm mt-2 line-clamp-3">{item.summary}</p>
                  ) : null}
                  {item.tags?.length ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={`${item._id}-tag-${index}`}
                          className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {tag.name || tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trending */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 mb-8">
          <div className="flex flex-col gap-2 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Trending in your semester</h2>
            <p className="text-slate-600">Popular resources students in your semester are downloading right now.</p>
          </div>
          {trending.length === 0 ? (
            <p className="text-slate-600">No trending data available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((item) => (
                <button
                  key={item._id}
                  onClick={() => navigate(`/resources/${item._id}`)}
                  className="text-left bg-slate-50 border border-slate-200 p-4 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Trending in your semester
                    </span>
                    <span className="text-xs text-slate-500">Trend {item.trendScore || 0}</span>
                  </div>
                  <p className="text-slate-900 font-semibold line-clamp-2">{item.title}</p>
                  {item.summary ? (
                    <p className="text-slate-500 text-sm mt-2 line-clamp-3">{item.summary}</p>
                  ) : null}
                  <p className="text-slate-600 text-sm mt-2">{item.subject} • Semester {item.semester}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Latest Documents</h2>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No documents uploaded yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-slate-50 border border-slate-200 p-6 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="mb-4">
                    <h3 className="text-slate-900 font-semibold text-lg mb-2 line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-2">
                      {doc.description || 'No description'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                      {doc.category}
                    </span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-200">
                      {doc.subject}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-slate-600 mb-4">
                    <span>📥 {doc.downloads} downloads</span>
                    <span>❤️ {doc.likes} likes</span>
                  </div>

                  <a 
                    href={`${API_ROOT}/resources/${doc._id}/download`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-block text-center"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/discussions')}
            className="bg-white border border-slate-200 shadow-sm p-6 rounded-lg text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Discussions
            </h3>
            <p className="text-slate-600 mt-2">
              Join discussions with fellow students and faculty
            </p>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="bg-white border border-slate-200 shadow-sm p-6 rounded-lg text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="text-4xl mb-3">👤</div>
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              My Profile
            </h3>
            <p className="text-slate-600 mt-2">
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
