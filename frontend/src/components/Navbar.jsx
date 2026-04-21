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
          <Link
            to="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500 text-sm font-bold text-white">
              AH
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-slate-900">AcadHub</div>
              <div className="text-xs font-medium text-slate-500">Study resources and notes</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className="navbar-link">Home</Link>
            <Link to="/search" className="navbar-link">Search</Link>

            {user && (
              <>
                <Link to="/resources" className="navbar-link">Resources</Link>
                <Link to="/discussions" className="navbar-link">Discussions</Link>
                <Link to="/events" className="navbar-link">Events</Link>
                <Link to="/assistant" className="navbar-link">AI Assistant</Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <img
                    src={avatarSrc}
                    alt={user?.name || "User avatar"}
                    className="h-8 w-8 rounded-full border border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">{firstName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Login
                </Link>
                <Link to="/signup" className="btn-primary text-sm py-2 px-4">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="space-y-2 border-t border-slate-200 pb-6 pt-4 md:hidden">
            <Link
              to="/"
              className="block rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
              onClick={() => setIsMenuOpen(false)}
            >
              Search
            </Link>

            {user && (
              <>
                <Link
                  to="/resources"
                  className="block rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Resources
                </Link>
                <Link
                  to="/discussions"
                  className="block rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Discussions
                </Link>
                <Link
                  to="/events"
                  className="block rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Events
                </Link>
                <Link
                  to="/assistant"
                  className="block rounded-lg px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                  onClick={() => setIsMenuOpen(false)}
                >
                  AI Assistant
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left font-medium text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}

            {!user && (
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
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
