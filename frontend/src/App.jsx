import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { authService } from "@/services/auth";
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
import DiscussionsPage from "@/pages/Discussions";
import EventsPage from "@/pages/Events";
import NotFoundPage from "@/pages/NotFound";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user profile from backend
          const response = await fetch("/api/v1/users/profile", {
            headers: {
              Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
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
