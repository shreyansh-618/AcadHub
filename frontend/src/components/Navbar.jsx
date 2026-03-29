import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
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

  const firstName = user?.name?.trim() ? user.name.split(" ")[0] : "User";

  const avatarSrc =
    user?.avatar ||
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop";

  return (
    <nav className="sticky top-0 z-50 navbar-gradient">
      <div className="container-max">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:shadow-md transition-all bg-[linear-gradient(135deg,#8b96a6,#697586)]">
              AH
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-slate-900">AcadHub</div>
              <div className="text-xs text-slate-500 font-medium">
                AI Learning Platform
              </div>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="navbar-link"
            >
              Home
            </Link>
            <Link
              to="/search"
              className="navbar-link"
            >
              Search
            </Link>

            {user && (
              <>
                <Link
                  to="/resources"
                  className="navbar-link"
                >
                  Resources
                </Link>
                <Link
                  to="/discussions"
                  className="navbar-link"
                >
                  Discussions
                </Link>
                <Link
                  to="/events"
                  className="navbar-link"
                >
                  Events
                </Link>
                <Link
                  to="/assistant"
                  className="navbar-link"
                >
                  AI Assistant
                </Link>
              </>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/70 transition-colors group border border-transparent hover:border-slate-200/70"
                >
                  <img
                    src={avatarSrc}
                    alt={user?.name || "User avatar"}
                    className="w-8 h-8 rounded-full border border-slate-300 shadow-sm group-hover:shadow-md transition-all"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-950">
                    {firstName}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-slate-700 font-semibold hover:bg-white/70 rounded-full transition-colors"
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
            className="md:hidden p-2 text-slate-700 hover:bg-white/70 rounded-full transition-colors border border-slate-200/70"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-6 space-y-2 border-t border-slate-200/70 pt-4 animate-in fade-in slide-in-from-top-2">
            <Link
              to="/"
              className="block px-4 py-2 text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium transition-colors rounded-2xl"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block px-4 py-2 text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium transition-colors rounded-2xl"
              onClick={() => setIsMenuOpen(false)}
            >
              Search
            </Link>

            {user && (
              <>
                <Link
                  to="/resources"
                  className="block px-4 py-2 text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium transition-colors rounded-2xl"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Resources
                </Link>
                <Link
                  to="/discussions"
                  className="block px-4 py-2 text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium transition-colors rounded-2xl"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Discussions
                </Link>
                <Link
                  to="/events"
                  className="block px-4 py-2 text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium transition-colors rounded-2xl"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Events
                </Link>
                <Link
                  to="/assistant"
                  className="block px-4 py-2 text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium transition-colors rounded-2xl"
                  onClick={() => setIsMenuOpen(false)}
                >
                  AI Assistant
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-rose-700 hover:bg-rose-50 font-medium transition-colors rounded-2xl flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}

            {!user && (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-200/70">
                <Link
                  to="/login"
                  className="btn-outline text-center py-2 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary text-center py-2 px-4"
                  onClick={() => setIsMenuOpen(false)}
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
