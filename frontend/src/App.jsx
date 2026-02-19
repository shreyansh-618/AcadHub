import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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
import NotFoundPage from "@/pages/NotFound";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          // Ensure we have a fresh ID token stored for API calls
          try {
            const idToken = await firebaseUser.getIdToken();
            localStorage.setItem("authToken", idToken);
          } catch (tokenError) {
            console.error("Failed to refresh auth token:", tokenError);
          }

          // Immediately set a minimal user from Firebase so protected routes can render
          setUser((prev) =>
            prev || {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name:
                firebaseUser.displayName ||
                firebaseUser.email ||
                "User",
              role: "student",
              department: "Computer Science",
            },
          );

          // Then try to enrich with full backend profile
          try {
            const response = await apiClient.get("/api/v1/users/profile");
            if (response.status === 200 && response.data?.data?.user) {
              // Extract user data from response structure
              setUser(response.data.data.user);
            } else {
              console.error("Invalid profile response structure", response.data);
            }
          } catch (profileError) {
            console.error("Failed to fetch user profile:", profileError);
            const status = profileError.response?.status;

            if (status === 401) {
              // Only log out on real authentication failures
              await authService.logout();
              setUser(null);
            } else if (status === 404) {
              // Profile doesn't exist yet, but Firebase auth is valid.
              // Keep the Firebase-based user so navigation still works.
              console.warn(
                "User profile not found; continuing with Firebase user only",
              );
            } else {
              // For other errors, keep the user logged in (e.g. network issues)
              console.warn(
                "Profile fetch error but keeping user session:",
                profileError.message,
              );
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state check error:", error);
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
              element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
            />
            <Route
              path="/signup"
              element={user ? <Navigate to="/dashboard" /> : <SignupPage />}
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user} element={<DashboardPage />} />
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute user={user} element={<ProfilePage />} />
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute user={user} element={<ResourcesPage />} />
              }
            />
            <Route
              path="/resources/:id"
              element={
                <ProtectedRoute user={user} element={<ResourceDetailPage />} />
              }
            />
            <Route
              path="/resources/:id/view"
              element={<FileViewerPage />}
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

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}
