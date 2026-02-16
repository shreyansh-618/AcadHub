import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';

export default function DiscussionsPage() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [filter, setFilter] = useState({ subject: '', department: '' });
  const [newDiscussionData, setNewDiscussionData] = useState({
    title: '',
    content: '',
    subject: '',
    department: '',
    tags: '',
  });
  const [replyContent, setReplyContent] = useState('');

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

  useEffect(() => {
    fetchDiscussions();
  }, [filter]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.subject) params.append('subject', filter.subject);
      if (filter.department) params.append('department', filter.department);

      const res = await fetch(`/api/v1/discussions?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setDiscussions(data.data?.discussions || []);
      } else {
        toast.error('Failed to fetch discussions');
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast.error('Failed to fetch discussions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussionDetail = async (id) => {
    try {
      const res = await fetch(`/api/v1/discussions/${id}`);

      if (res.ok) {
        const data = await res.json();
        setSelectedDiscussion(data.data?.discussion);
      } else {
        toast.error('Failed to fetch discussion');
      }
    } catch (error) {
      console.error('Error fetching discussion:', error);
      toast.error('Failed to fetch discussion');
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();

    if (!newDiscussionData.title.trim() || !newDiscussionData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        navigate('/login');
        return;
      }

      const token = await firebaseUser.getIdToken();

      const res = await fetch('/api/v1/discussions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newDiscussionData.title,
          content: newDiscussionData.content,
          subject: newDiscussionData.subject || 'General',
          department: newDiscussionData.department || 'General',
          tags: newDiscussionData.tags.split(',').map(tag => tag.trim()) || [],
        }),
      });

      if (res.ok) {
        toast.success('Discussion created successfully!');
        setNewDiscussionData({
          title: '',
          content: '',
          subject: '',
          department: '',
          tags: '',
        });
        setShowNewDiscussion(false);
        fetchDiscussions();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to create discussion');
      }
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast.error('Failed to create discussion');
    }
  };

  const handleAddReply = async (discussionId) => {
    if (!replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        navigate('/login');
        return;
      }

      const token = await firebaseUser.getIdToken();

      const res = await fetch(`/api/v1/discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        toast.success('Reply added successfully!');
        setReplyContent('');
        fetchDiscussionDetail(discussionId);
      } else {
        toast.error('Failed to add reply');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="glass-lg p-8 rounded-2xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Discussion Forum</h1>
              <p className="text-slate-400">
                Join discussions with your peers. All users are anonymous here! 🔒
              </p>
            </div>
            <button
              onClick={() => setShowNewDiscussion(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              💬 Start Discussion
            </button>
          </div>
        </div>

        {selectedDiscussion ? (
          // Discussion Detail View
          <div className="glass-lg rounded-2xl p-8">
            <button
              onClick={() => setSelectedDiscussion(null)}
              className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              ← Back to Discussions
            </button>

            {/* Discussion Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">{selectedDiscussion.title}</h2>
              <div className="flex items-center gap-4 text-slate-400 mb-4">
                <span>Anonymous User • {new Date(selectedDiscussion.createdAt).toLocaleDateString()}</span>
                <span>👁️ {selectedDiscussion.views} views</span>
                <span>💬 {selectedDiscussion.replies?.length || 0} replies</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDiscussion.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-500 bg-opacity-30 text-blue-300 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="bg-slate-700 p-4 rounded-lg mb-6">
                <p className="text-slate-200 whitespace-pre-wrap">{selectedDiscussion.content}</p>
              </div>
            </div>

            {/* Mark Helpful */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                👍 Mark as Helpful ({selectedDiscussion.helpful || 0})
              </button>
            </div>

            {/* Replies */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">Replies</h3>

              {selectedDiscussion.replies && selectedDiscussion.replies.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {selectedDiscussion.replies.map((reply, index) => (
                    <div key={index} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-white">Anonymous User</p>
                        <p className="text-xs text-slate-400">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-slate-200 mb-2">{reply.content}</p>
                      <button className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                        👍 Helpful ({reply.helpful || 0})
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 mb-8">No replies yet. Be the first to reply!</p>
              )}
            </div>

            {/* Add Reply */}
            <div className="bg-slate-700 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">Add Your Reply</h4>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows="4"
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none mb-4"
                placeholder="Share your thoughts... (Anonymous)"
              />
              <button
                onClick={() => handleAddReply(selectedDiscussion._id)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Post Reply
              </button>
            </div>
          </div>
        ) : (
          // Discussions List View
          <>
            {/* Filters */}
            <div className="glass-lg p-6 rounded-lg mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-200 text-sm font-semibold mb-2">
                    Filter by Subject
                  </label>
                  <select
                    value={filter.subject}
                    onChange={(e) => setFilter({ ...filter, subject: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Discussions List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="text-slate-400">Loading discussions...</div>
              </div>
            ) : discussions.length === 0 ? (
              <div className="glass-lg p-12 rounded-lg text-center">
                <p className="text-slate-400 text-lg mb-6">
                  No discussions yet. Be the first to start one!
                </p>
                <button
                  onClick={() => setShowNewDiscussion(true)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Start Discussion
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <div
                    key={discussion._id}
                    onClick={() => fetchDiscussionDetail(discussion._id)}
                    className="glass-lg p-6 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2 hover:text-blue-400">
                      {discussion.title}
                    </h3>
                    <p className="text-slate-400 mb-3 line-clamp-2">{discussion.content}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {discussion.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-300 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span>👁️ {discussion.views} views</span>
                      <span>💬 {discussion.replies?.length || 0} replies</span>
                      <span>👍 {discussion.helpful || 0} helpful</span>
                      <span className="ml-auto">
                        {new Date(discussion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Discussion Modal */}
      {showNewDiscussion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Start New Discussion</h2>
              <button
                onClick={() => setShowNewDiscussion(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDiscussion} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-200 text-sm font-semibold mb-2">
                  Discussion Title *
                </label>
                <input
                  type="text"
                  value={newDiscussionData.title}
                  onChange={(e) =>
                    setNewDiscussionData({ ...newDiscussionData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="block text-slate-200 text-sm font-semibold mb-2">
                  Subject
                </label>
                <select
                  value={newDiscussionData.subject}
                  onChange={(e) =>
                    setNewDiscussionData({ ...newDiscussionData, subject: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-200 text-sm font-semibold mb-2">
                  Description *
                </label>
                <textarea
                  value={newDiscussionData.content}
                  onChange={(e) =>
                    setNewDiscussionData({ ...newDiscussionData, content: e.target.value })
                  }
                  rows="6"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Explain your query in detail..."
                />
              </div>

              <div>
                <label className="block text-slate-200 text-sm font-semibold mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newDiscussionData.tags}
                  onChange={(e) =>
                    setNewDiscussionData({ ...newDiscussionData, tags: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., array, sorting, algorithm"
                />
              </div>

              <p className="text-sm text-slate-400 flex items-center gap-2">
                🔒 <span>Your identity is completely anonymous in this forum!</span>
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Post Discussion
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDiscussion(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
