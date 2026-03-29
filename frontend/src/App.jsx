import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { authService } from "@/services/auth";
import { apiClient } from "@/services/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import HomePage from "@/pages/Home";
import LoginPage from "@/pages/Login";
import SignupPage from "@/pages/Signup";
import DashboardPage from "@/pages/Dashboard";
import ProfilePage from "@/pages/Profile";
import SearchPage from "@/pages/Search";
import ResourcesPage from "@/pages/Resources";
import ResourceDetailPage from "@/pages/ResourceDetail";
import FileViewerPage from "@/pages/FileViewer";
import DiscussionsPage from "@/pages/Discussions";
import EventsPage from "@/pages/Events";
import AcademicAssistant from "@/pages/AcademicAssistant";
import NotFoundPage from "@/pages/NotFound";

function AppContent({ user, loading }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-navigate to dashboard when user logs in
  useEffect(() => {
    if (!loading && user) {
      const authPages = ["/login", "/signup"];
      if (authPages.includes(location.pathname)) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />

          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" replace /> : <LoginPage />
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/dashboard" replace /> : <SignupPage />
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute user={user} element={<DashboardPage />} />}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute user={user} element={<ProfilePage />} />}
          />
          <Route
            path="/resources"
            element={<ProtectedRoute user={user} element={<ResourcesPage />} />}
          />
          <Route
            path="/resources/:id"
            element={
              <ProtectedRoute user={user} element={<ResourceDetailPage />} />
            }
          />
          <Route
            path="/resources/:id/view"
            element={<ProtectedRoute user={user} element={<FileViewerPage />} />}
          />
          <Route
            path="/discussions"
            element={
              <ProtectedRoute user={user} element={<DiscussionsPage />} />
            }
          />
          <Route
            path="/events"
            element={<ProtectedRoute user={user} element={<EventsPage />} />}
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute user={user} element={<AcademicAssistant />} />
            }
          />
          <Route
            path="/assistant/:resourceId"
            element={
              <ProtectedRoute user={user} element={<AcademicAssistant />} />
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          // Always use a fresh Firebase token here to avoid race conditions
          // where onAuthStateChanged fires before authService stores localStorage token.
          const freshToken = await firebaseUser.getIdToken();
          localStorage.setItem("authToken", freshToken);

          // Fetch user profile with smart retry logic
          const fetchProfile = async (retryCount = 0) => {
            try {
              const response = await apiClient.get("/users/profile");

              if (response.status === 200 && response.data?.data?.user) {
                setUser(response.data.data.user);
                return true;
              } else {
                console.error("Invalid profile response structure");
                setUser(null);
                return false;
              }
            } catch (profileError) {
              const status = profileError.response?.status;
              const errorMsg = profileError.message;

              // Handle 404 with retries (user creation race condition)
              if (status === 404 && retryCount < 3) {
                console.info(
                  `Profile not found (attempt ${retryCount + 1}/4). Retrying in 500ms...`,
                );
                // Wait and retry recursively
                await new Promise((resolve) => setTimeout(resolve, 500));
                return fetchProfile(retryCount + 1);
              }

              // Handle 401 (invalid token)
              if (status === 401) {
                if (retryCount < 1 && firebaseUser) {
                  console.warn(
                    "Token rejected. Refreshing token and retrying profile fetch...",
                  );
                  const refreshedToken = await firebaseUser.getIdToken(true);
                  localStorage.setItem("authToken", refreshedToken);
                  return fetchProfile(retryCount + 1);
                }

                console.error(
                  "Invalid/expired token after retry. Logging out.",
                );
                await authService.logout();
                setUser(null);
                return false;
              }

              // After max retries on 404
              if (status === 404) {
                console.error(
                  "User profile not found after 4 attempts. Logging out.",
                );
                await authService.logout();
                setUser(null);
                return false;
              }

              // For other errors, keep user logged in (likely network issues)
              console.warn("Profile fetch error (keeping session):", errorMsg);
              return true;
            }
          };

          await fetchProfile();
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppContent user={user} loading={loading} />
    </Router>
  );
}
