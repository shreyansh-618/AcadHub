import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Users,
  Calendar,
  Zap,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-secondary-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-72 h-72 bg-accent-200 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="container-max">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-6 px-4 py-2 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
              ✨ Welcome to the Future of Academic Learning
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered Academic Intelligence Platform
            </h1>

            <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed max-w-2xl mx-auto">
              Discover, learn, and collaborate with an intelligent platform that
              understands your academic needs. Semantic search, AI assistant,
              and community-driven resources all in one place.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                to="/search"
                className="btn-primary inline-flex items-center gap-2"
              >
                Start Exploring <ArrowRight size={20} />
              </Link>

              <Link
                to="/signup"
                className="btn-outline inline-flex items-center gap-2"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 bg-gradient-to-r from-gray-50 to-white border-y border-gray-200">
        <div className="container-max">
          <div className="text-center mb-8">
            <p className="text-gray-600 font-semibold">
              Trusted by students and educators worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">
                10K+
              </div>
              <p className="text-gray-600">Active Students</p>
            </div>

            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">
                500K+
              </div>
              <p className="text-gray-600">Resources</p>
            </div>

            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">
                50+
              </div>
              <p className="text-gray-600">Institutions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 relative">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to excel in your academic journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card-gradient group hover-lift">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 text-white">
                <Sparkles size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                AI-Powered Search
              </h3>

              <p className="text-gray-700 leading-relaxed">
                Semantic search that understands your intent. Find relevant
                resources instantly.
              </p>
            </div>

            <div className="card-gradient group hover-lift">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mb-4 text-white">
                <BookOpen size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                Resource Hub
              </h3>

              <p className="text-gray-700 leading-relaxed">
                Centralized library of PDFs, notes, presentations, and question
                papers.
              </p>
            </div>

            <div className="card-gradient group hover-lift">
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4 text-white">
                <Users size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                Discussions
              </h3>

              <p className="text-gray-700 leading-relaxed">
                Collaborate with peers and faculty to share knowledge.
              </p>
            </div>

            <div className="card-gradient group hover-lift">
              <div className="w-12 h-12 bg-gradient-cool rounded-lg flex items-center justify-center mb-4 text-white">
                <Calendar size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                Event Management
              </h3>

              <p className="text-gray-700 leading-relaxed">
                Track seminars, deadlines, and workshops.
              </p>
            </div>

            <div className="card-gradient group hover-lift">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 text-white">
                <Zap size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                Smart Assistant
              </h3>

              <p className="text-gray-700 leading-relaxed">
                Get instant answers with our AI academic assistant powered by
                RAG.
              </p>
            </div>

            <div className="card-gradient group hover-lift">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mb-4 text-white">
                <CheckCircle size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                Smart Filtering
              </h3>

              <p className="text-gray-700 leading-relaxed">
                Filter resources by department, semester, category, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 relative">
        <div className="container-max">
          <div className="bg-gradient-primary rounded-3xl p-12 md:p-16 text-center text-white shadow-lg">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Learning?
            </h2>

            <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students already using AcadHub to excel in their
              studies.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                to="/signup"
                className="btn-primary bg-white text-primary-600 hover:bg-primary-50"
              >
                Get Started Free
              </Link>

              <Link
                to="/search"
                className="border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition-all"
              >
                Explore Platform
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
