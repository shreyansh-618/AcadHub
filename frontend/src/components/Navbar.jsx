import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/services/auth";

export default function Navbar({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ✅ SAFE derived values
  const firstName = user?.name?.trim() ? user.name.split(" ")[0] : "User";

  const avatarSrc =
    user?.avatar ||
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop";

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-700">
      <div className="container-max">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl gradient-text group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all">
              AP
            </div>
            <span className="hidden sm:inline">Academic Platform</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-slate-300 hover:text-blue-400 transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            <Link
              to="/search"
              className="text-slate-300 hover:text-purple-400 transition-colors duration-200 font-medium"
            >
              Search
            </Link>

            {user && (
              <>
                <Link
                  to="/resources"
                  className="text-slate-300 hover:text-blue-400 transition-colors duration-200 font-medium"
                >
                  Resources
                </Link>
                <Link
                  to="/discussions"
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 font-medium"
                >
                  Discussions
                </Link>
                <Link
                  to="/events"
                  className="text-slate-300 hover:text-pink-400 transition-colors duration-200 font-medium"
                >
                  Events
                </Link>
              </>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-slate-300 hover:text-blue-400 transition-colors"
                >
                  <img
                    src={avatarSrc}
                    alt={user?.name || "User avatar"}
                    className="w-8 h-8 rounded-full border border-blue-400 border-opacity-30"
                  />
                  <span className="text-sm font-medium">{firstName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-slate-300 hover:text-red-400 transition-colors duration-200 font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-blue-400 transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
                <Link to="/signup" className="btn-primary text-sm py-2 px-4">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-slate-300 hover:text-blue-400 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-6 space-y-2 border-t border-slate-700 border-opacity-30 pt-4">
            <Link
              to="/"
              className="block text-slate-300 hover:text-blue-400 py-2 font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block text-slate-300 hover:text-purple-400 py-2 font-medium transition-colors"
            >
              Search
            </Link>

            {user && (
              <>
                <Link
                  to="/resources"
                  className="block text-slate-300 hover:text-blue-400 py-2 font-medium transition-colors"
                >
                  Resources
                </Link>
                <Link
                  to="/discussions"
                  className="block text-slate-300 hover:text-purple-400 py-2 font-medium transition-colors"
                >
                  Discussions
                </Link>
                <Link
                  to="/events"
                  className="block text-slate-300 hover:text-pink-400 py-2 font-medium transition-colors"
                >
                  Events
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-slate-300 hover:text-red-400 py-2 font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            )}

            {!user && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700 border-opacity-30">
                <Link
                  to="/login"
                  className="btn-ghost flex-1 text-center py-2 px-4"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary flex-1 text-center py-2 px-4"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
