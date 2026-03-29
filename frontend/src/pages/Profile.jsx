import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "@/services/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [likedDocs, setLikedDocs] = useState([]);
  const [savedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    avatar: "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const firebaseUser = await authService.getCurrentUser();

        if (!firebaseUser) {
          navigate("/login");
          return;
        }

        const token = await firebaseUser.getIdToken();

        const profileRes = await fetch("/api/v1/users/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const profileUser = profileData.data?.user || profileData;
          setUser(profileUser);
          setFormData({
            name: profileUser?.name || "",
            bio: profileUser?.bio || "",
            avatar: profileUser?.avatar || "",
          });
        }

        const uploadedRes = await fetch("/api/v1/resources/my-uploads", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (uploadedRes.ok) {
          const uploadedData = await uploadedRes.json();
          setUploadedDocs(uploadedData.data?.resources || []);
        }

        const likedRes = await fetch("/api/v1/resources/my-likes", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (likedRes.ok) {
          const likedData = await likedRes.json();
          setLikedDocs(likedData.data?.resources || []);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      const token = await firebaseUser.getIdToken();

      const res = await fetch("/api/v1/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
          avatar: formData.avatar,
        }),
      });

      if (res.ok) {
        toast.success("Profile updated successfully!");
        setEditMode(false);
        const data = await res.json();
        setUser(data.data?.user || data.user);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-slate-500" />
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const renderDocCard = (doc, type) => (
    <div
      key={doc._id}
      className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4 shadow-[0_10px_28px_rgba(91,101,118,0.06)]"
    >
      <h4 className="mb-2 font-semibold text-slate-900">{doc.title}</h4>
      <p className="mb-3 text-sm text-slate-600">{doc.description}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{doc.category}</span>
        <span>{type === "liked" ? `Likes ${doc.likes}` : `Downloads ${doc.downloads}`}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn-outline flex-1 px-3 py-2 text-sm">View</button>
        {type === "uploaded" && (
          <button className="rounded-full bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-shell py-12">
      <div className="mx-auto max-w-6xl">
        <div className="glass-lg mb-8 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b96a6,#697586)] text-3xl font-bold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {user?.name || "User"}
                </h1>
                <p className="text-slate-500">{user?.email}</p>
                <p className="text-slate-500 capitalize">
                  {user?.role} • {user?.department}
                </p>
                {user?.bio && <p className="mt-2 text-slate-600">{user.bio}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full bg-rose-100 px-6 py-3 font-semibold text-rose-700 transition-colors hover:bg-rose-200"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="glass-lg overflow-hidden">
          <div className="flex flex-wrap border-b border-slate-200">
            {["profile", "uploaded", "liked", "saved"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-[linear-gradient(135deg,#8b96a6,#697586)] text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab === "profile" && "Profile Details"}
                {tab === "uploaded" && `Uploaded (${uploadedDocs.length})`}
                {tab === "liked" && `Liked (${likedDocs.length})`}
                {tab === "saved" && `Saved (${savedDocs.length})`}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === "profile" && (
              <div>
                {!editMode ? (
                  <div>
                    <h3 className="mb-4 text-xl font-bold text-slate-900">
                      Profile Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-slate-500">Full Name</label>
                        <p className="text-lg text-slate-900">{user?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Email</label>
                        <p className="text-lg text-slate-900">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Role</label>
                        <p className="text-lg capitalize text-slate-900">{user?.role}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Department</label>
                        <p className="text-lg text-slate-900">{user?.department}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Bio</label>
                        <p className="text-lg text-slate-900">
                          {user?.bio || "No bio added yet"}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setEditMode(true)} className="btn-primary mt-6">
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Bio
                        </label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows="4"
                          className="textarea-field"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Avatar URL (optional)
                        </label>
                        <input
                          type="text"
                          name="avatar"
                          value={formData.avatar}
                          onChange={handleInputChange}
                          className="input-field"
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={handleSaveProfile} className="btn-primary">
                        Save Changes
                      </button>
                      <button onClick={() => setEditMode(false)} className="btn-outline">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "uploaded" && (
              <div>
                {uploadedDocs.length === 0 ? (
                  <p className="py-8 text-center text-slate-500">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {uploadedDocs.map((doc) => renderDocCard(doc, "uploaded"))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "liked" && (
              <div>
                {likedDocs.length === 0 ? (
                  <p className="py-8 text-center text-slate-500">
                    No liked documents yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {likedDocs.map((doc) => renderDocCard(doc, "liked"))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "saved" && (
              <div>
                <p className="py-8 text-center text-slate-500">
                  Saved documents feature coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
