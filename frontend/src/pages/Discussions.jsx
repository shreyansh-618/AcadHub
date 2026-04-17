import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "@/services/auth";
import { API_ROOT } from "@/services/urlConfig";

export default function DiscussionsPage() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [filter, setFilter] = useState({ subject: "", department: "" });
  const [newDiscussionData, setNewDiscussionData] = useState({
    title: "",
    content: "",
    subject: "",
    department: "",
    tags: "",
  });
  const [replyContent, setReplyContent] = useState("");

  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Computer Science",
    "Data Structures",
    "Algorithms",
    "Web Development",
    "Database Management",
    "Operating Systems",
    "Other",
  ];

  const fetchDiscussions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.subject) params.append("subject", filter.subject);
      if (filter.department) params.append("department", filter.department);

      const res = await fetch(`${API_ROOT}/discussions?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setDiscussions(data.data?.discussions || []);
      } else {
        toast.error("Failed to fetch discussions");
      }
    } catch (error) {
      console.error("Error fetching discussions:", error);
      toast.error("Failed to fetch discussions");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchDiscussions();
  }, [fetchDiscussions]);

  const fetchDiscussionDetail = async (id) => {
    try {
      const res = await fetch(`${API_ROOT}/discussions/${id}`);

      if (res.ok) {
        const data = await res.json();
        setSelectedDiscussion(data.data?.discussion);
      } else {
        toast.error("Failed to fetch discussion");
      }
    } catch (error) {
      console.error("Error fetching discussion:", error);
      toast.error("Failed to fetch discussion");
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();

    if (!newDiscussionData.title.trim() || !newDiscussionData.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      const token = await firebaseUser.getIdToken();

      const res = await fetch(`${API_ROOT}/discussions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDiscussionData.title,
          content: newDiscussionData.content,
          subject: newDiscussionData.subject || "General",
          department: newDiscussionData.department || "General",
          tags: newDiscussionData.tags.split(",").map((tag) => tag.trim()) || [],
        }),
      });

      if (res.ok) {
        toast.success("Discussion created successfully!");
        setNewDiscussionData({
          title: "",
          content: "",
          subject: "",
          department: "",
          tags: "",
        });
        setShowNewDiscussion(false);
        fetchDiscussions();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to create discussion");
      }
    } catch (error) {
      console.error("Error creating discussion:", error);
      toast.error("Failed to create discussion");
    }
  };

  const handleAddReply = async (discussionId) => {
    if (!replyContent.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      const token = await firebaseUser.getIdToken();

      const res = await fetch(`${API_ROOT}/discussions/${discussionId}/replies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        toast.success("Reply added successfully!");
        setReplyContent("");
        fetchDiscussionDetail(discussionId);
      } else {
        toast.error("Failed to add reply");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    }
  };

  return (
    <div className="page-shell py-12">
      <div className="mx-auto max-w-6xl">
        <div className="glass-lg mb-8 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-slate-900">
                Discussion Forum
              </h1>
              <p className="text-slate-600">
                Join discussions with your peers. Posts stay anonymous here for
                low-pressure learning.
              </p>
            </div>
            <button onClick={() => setShowNewDiscussion(true)} className="btn-primary">
              Start Discussion
            </button>
          </div>
        </div>

        {selectedDiscussion ? (
          <div className="glass-lg p-8">
            <button onClick={() => setSelectedDiscussion(null)} className="btn-outline mb-6">
              Back to Discussions
            </button>

            <div className="mb-8">
              <h2 className="mb-4 text-3xl font-bold text-slate-900">
                {selectedDiscussion.title}
              </h2>
              <div className="mb-4 flex flex-wrap items-center gap-4 text-slate-500">
                <span>
                  Anonymous User •{" "}
                  {new Date(selectedDiscussion.createdAt).toLocaleDateString()}
                </span>
                <span>{selectedDiscussion.views} views</span>
                <span>{selectedDiscussion.replies?.length || 0} replies</span>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedDiscussion.tags?.map((tag) => (
                  <span key={tag} className="badge badge-primary text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5">
                <p className="whitespace-pre-wrap text-slate-700">
                  {selectedDiscussion.content}
                </p>
              </div>
            </div>

            <div className="mb-8 border-b border-slate-200 pb-8">
              <button className="btn-outline">
                Mark as Helpful ({selectedDiscussion.helpful || 0})
              </button>
            </div>

            <div className="mb-8">
              <h3 className="mb-6 text-2xl font-bold text-slate-900">Replies</h3>

              {selectedDiscussion.replies && selectedDiscussion.replies.length > 0 ? (
                <div className="mb-8 space-y-4">
                  {selectedDiscussion.replies.map((reply, index) => (
                    <div
                      key={index}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4"
                    >
                      <div className="mb-2 flex justify-between">
                        <p className="font-semibold text-slate-900">
                          Anonymous User
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="mb-2 text-slate-700">{reply.content}</p>
                      <button className="text-sm text-slate-500 transition-colors hover:text-slate-900">
                        Helpful ({reply.helpful || 0})
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-8 text-slate-500">
                  No replies yet. Be the first to reply.
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-6">
              <h4 className="mb-4 text-lg font-semibold text-slate-900">
                Add Your Reply
              </h4>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows="4"
                className="textarea-field mb-4"
                placeholder="Share your thoughts... (anonymous)"
              />
              <button
                onClick={() => handleAddReply(selectedDiscussion._id)}
                className="btn-primary"
              >
                Post Reply
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="glass-lg mb-8 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Filter by Subject
                  </label>
                  <select
                    value={filter.subject}
                    onChange={(e) =>
                      setFilter({ ...filter, subject: e.target.value })
                    }
                    className="input-field"
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

            {loading ? (
              <div className="py-12 text-center text-slate-500">
                Loading discussions...
              </div>
            ) : discussions.length === 0 ? (
              <div className="glass-lg p-12 text-center">
                <p className="mb-6 text-lg text-slate-500">
                  No discussions yet. Be the first to start one.
                </p>
                <button
                  onClick={() => setShowNewDiscussion(true)}
                  className="btn-primary"
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
                    className="glass-lg cursor-pointer p-6 transition-all hover:-translate-y-0.5 hover:bg-white/90"
                  >
                    <h3 className="mb-2 text-xl font-semibold text-slate-900">
                      {discussion.title}
                    </h3>
                    <p className="mb-3 line-clamp-2 text-slate-600">
                      {discussion.content}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {discussion.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge badge-primary text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                      <span>{discussion.views} views</span>
                      <span>{discussion.replies?.length || 0} replies</span>
                      <span>{discussion.helpful || 0} helpful</span>
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

      {showNewDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
          <div className="glass-lg max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/85 p-6 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-slate-900">
                Start New Discussion
              </h2>
              <button
                onClick={() => setShowNewDiscussion(false)}
                className="text-2xl text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDiscussion} className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Discussion Title *
                </label>
                <input
                  type="text"
                  value={newDiscussionData.title}
                  onChange={(e) =>
                    setNewDiscussionData({
                      ...newDiscussionData,
                      title: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subject
                </label>
                <select
                  value={newDiscussionData.subject}
                  onChange={(e) =>
                    setNewDiscussionData({
                      ...newDiscussionData,
                      subject: e.target.value,
                    })
                  }
                  className="input-field"
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description *
                </label>
                <textarea
                  value={newDiscussionData.content}
                  onChange={(e) =>
                    setNewDiscussionData({
                      ...newDiscussionData,
                      content: e.target.value,
                    })
                  }
                  rows="6"
                  className="textarea-field"
                  placeholder="Explain your query in detail..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newDiscussionData.tags}
                  onChange={(e) =>
                    setNewDiscussionData({
                      ...newDiscussionData,
                      tags: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="e.g., array, sorting, algorithm"
                />
              </div>

              <p className="text-sm text-slate-500">
                Your identity is completely anonymous in this forum.
              </p>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Post Discussion
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDiscussion(false)}
                  className="btn-outline flex-1"
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

