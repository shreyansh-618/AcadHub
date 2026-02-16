import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [likedDocs, setLikedDocs] = useState([]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: '',
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const firebaseUser = await authService.getCurrentUser();

        if (!firebaseUser) {
          navigate('/login');
          return;
        }

        const token = await firebaseUser.getIdToken();

        // Fetch user profile
        const profileRes = await fetch('/api/v1/users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUser(profileData.data?.user || profileData);
          setFormData({
            name: profileData.data?.user?.name || profileData.name || '',
            bio: profileData.data?.user?.bio || profileData.bio || '',
            avatar: profileData.data?.user?.avatar || profileData.avatar || '',
          });
        }

        // Fetch uploaded documents
        const uploadedRes = await fetch('/api/v1/resources/my-uploads', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (uploadedRes.ok) {
          const uploadedData = await uploadedRes.json();
          setUploadedDocs(uploadedData.data?.resources || []);
        }

        // Fetch liked documents
        const likedRes = await fetch('/api/v1/resources/my-likes', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (likedRes.ok) {
          const likedData = await likedRes.json();
          setLikedDocs(likedData.data?.resources || []);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const firebaseUser = await authService.getCurrentUser();
      if (!firebaseUser) {
        navigate('/login');
        return;
      }

      const token = await firebaseUser.getIdToken();

      const res = await fetch('/api/v1/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
          avatar: formData.avatar,
        }),
      });

      if (res.ok) {
        toast.success('Profile updated successfully!');
        setEditMode(false);
        const data = await res.json();
        setUser(data.data?.user || data.user);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="glass-lg p-8 rounded-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{user?.name || 'User'}</h1>
                <p className="text-slate-400">{user?.email}</p>
                <p className="text-slate-400 capitalize">{user?.role} • {user?.department}</p>
                {user?.bio && <p className="text-slate-300 mt-2">{user.bio}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-lg rounded-2xl overflow-hidden mb-8">
          <div className="flex border-b border-slate-700">
            {['profile', 'uploaded', 'liked', 'saved'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'profile' && 'Profile Details'}
                {tab === 'uploaded' && `Uploaded (${uploadedDocs.length})`}
                {tab === 'liked' && `Liked (${likedDocs.length})`}
                {tab === 'saved' && `Saved (${savedDocs.length})`}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                {!editMode ? (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-4">Profile Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-slate-400 text-sm">Full Name</label>
                          <p className="text-white text-lg">{user?.name}</p>
                        </div>
                        <div>
                          <label className="text-slate-400 text-sm">Email</label>
                          <p className="text-white text-lg">{user?.email}</p>
                        </div>
                        <div>
                          <label className="text-slate-400 text-sm">Role</label>
                          <p className="text-white text-lg capitalize">{user?.role}</p>
                        </div>
                        <div>
                          <label className="text-slate-400 text-sm">Department</label>
                          <p className="text-white text-lg">{user?.department}</p>
                        </div>
                        <div>
                          <label className="text-slate-400 text-sm">Bio</label>
                          <p className="text-white text-lg">{user?.bio || 'No bio added yet'}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-slate-200 text-sm font-semibold mb-2">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-200 text-sm font-semibold mb-2">Bio</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows="4"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div>
                        <label className="block text-slate-200 text-sm font-semibold mb-2">Avatar URL (optional)</label>
                        <input
                          type="text"
                          name="avatar"
                          value={formData.avatar}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveProfile}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Uploaded Documents Tab */}
            {activeTab === 'uploaded' && (
              <div>
                {uploadedDocs.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No documents uploaded yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uploadedDocs.map((doc) => (
                      <div key={doc._id} className="bg-slate-700 p-4 rounded-lg hover:bg-slate-600 transition-colors">
                        <h4 className="text-white font-semibold mb-2">{doc.title}</h4>
                        <p className="text-slate-400 text-sm mb-3">{doc.description}</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>{doc.category}</span>
                          <span>{doc.downloads} downloads</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className="flex-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors">
                            View
                          </button>
                          <button className="flex-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Liked Documents Tab */}
            {activeTab === 'liked' && (
              <div>
                {likedDocs.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No liked documents yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {likedDocs.map((doc) => (
                      <div key={doc._id} className="bg-slate-700 p-4 rounded-lg hover:bg-slate-600 transition-colors">
                        <h4 className="text-white font-semibold mb-2">{doc.title}</h4>
                        <p className="text-slate-400 text-sm mb-3">{doc.description}</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>{doc.category}</span>
                          <span>❤️ {doc.likes}</span>
                        </div>
                        <div className="mt-3">
                          <button className="w-full px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors">
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Saved Documents Tab */}
            {activeTab === 'saved' && (
              <div>
                <p className="text-slate-400 text-center py-8">Saved documents feature coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
