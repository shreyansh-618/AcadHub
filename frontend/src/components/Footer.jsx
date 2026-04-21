import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-max py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-3 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500 text-sm font-bold text-white">
                AH
              </div>
              <span className="text-slate-900">AcadHub</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              A shared place for academic resources, course discussions, and
              document-based questions.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-slate-900">Browse</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="font-medium text-slate-600 hover:text-slate-950">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className="font-medium text-slate-600 hover:text-slate-950">
                  Search
                </Link>
              </li>
              <li>
                <Link to="/resources" className="font-medium text-slate-600 hover:text-slate-950">
                  Resources
                </Link>
              </li>
              <li>
                <Link to="/assistant" className="font-medium text-slate-600 hover:text-slate-950">
                  AI Assistant
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-slate-900">Account</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/login" className="font-medium text-slate-600 hover:text-slate-950">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="font-medium text-slate-600 hover:text-slate-950">
                  Sign up
                </Link>
              </li>
              <li>
                <Link to="/profile" className="font-medium text-slate-600 hover:text-slate-950">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">© {currentYear} AcadHub.</p>
        </div>
      </div>
    </footer>
  );
}
