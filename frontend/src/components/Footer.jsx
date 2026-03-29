import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(247,248,249,0.72),rgba(238,240,242,0.9))] backdrop-blur-xl">
      <div className="container-max py-16">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8b96a6,#697586)] text-sm font-bold text-white shadow-sm">
                AH
              </div>
              <span className="gradient-text">AcadHub</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              AI-powered academic resource management platform for students and
              educators.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-slate-900">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="font-medium text-slate-600 hover:text-slate-950">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Search
                </Link>
              </li>
              <li>
                <a
                  href="#features"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-slate-900">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#docs"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#api"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  API Docs
                </a>
              </li>
              <li>
                <a
                  href="#blog"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#support"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-slate-900">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#privacy"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="font-medium text-slate-600 hover:text-slate-950"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200/70 pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <p className="text-sm text-slate-600">
              © {currentYear} AcadHub. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="#github"
                className="rounded-full p-2 text-slate-600 transition-colors duration-200 hover:bg-white/70 hover:text-slate-950"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="#linkedin"
                className="rounded-full p-2 text-slate-600 transition-colors duration-200 hover:bg-white/70 hover:text-slate-950"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="#twitter"
                className="rounded-full p-2 text-slate-600 transition-colors duration-200 hover:bg-white/70 hover:text-slate-950"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#email"
                className="rounded-full p-2 text-slate-600 transition-colors duration-200 hover:bg-white/70 hover:text-slate-950"
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
