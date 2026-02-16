import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="container-max">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-6xl font-bold gradient-text mb-6 leading-tight">
              Centralized Academic Resource Management
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              AI-powered semantic search, collaborative discussions, and intelligent resource discovery for colleges and universities.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/search" className="btn-primary">
                Start Searching
              </Link>
              <Link to="/signup" className="btn-secondary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-0 top-1/2 w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="container-max">
          <h2 className="text-5xl font-bold text-center gradient-text mb-16">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card group">
              <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-opacity-30 transition-all">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">AI-Powered Search</h3>
              <p className="text-slate-400">
                Semantic search that understands your intent, not just keywords. Find exactly what you need instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card group">
              <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-opacity-30 transition-all">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Centralized Resources</h3>
              <p className="text-slate-400">
                All your PDFs, presentations, notes, and question papers in one place, organized by subject and semester.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card group">
              <div className="w-12 h-12 bg-pink-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-opacity-30 transition-all">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Community Forum</h3>
              <p className="text-slate-400">
                Ask questions, share knowledge, and collaborate with peers and faculty. Peer-to-peer learning at scale.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card group">
              <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-opacity-30 transition-all">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Event Management</h3>
              <p className="text-slate-400">
                Never miss deadlines, seminars, or workshops. Calendar view with notifications for all academic events.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card group">
              <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-opacity-30 transition-all">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Role-Based Access</h3>
              <p className="text-slate-400">
                Customized dashboards for students, faculty, and admins. Each role has relevant tools and information.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card group">
              <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-opacity-30 transition-all">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Secure & Private</h3>
              <p className="text-slate-400">
                Firebase authentication, encrypted data, and role-based access control ensure your information is secure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="container-max">
          <h2 className="text-5xl font-bold text-center gradient-text mb-16">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { number: 1, title: 'Sign Up', description: 'Create an account as a student, faculty, or admin' },
              { number: 2, title: 'Upload/Discover', description: 'Upload resources or browse existing materials' },
              { number: 3, title: 'Search Semantically', description: 'Use AI-powered search to find exactly what you need' },
              { number: 4, title: 'Collaborate', description: 'Discuss, ask questions, and learn together' },
            ].map((step) => (
              <div key={step.number} className="relative">
                <div className="card text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {step.number}
                  </div>
                  <h3 className="font-semibold mb-2 text-white">{step.title}</h3>
                  <p className="text-sm text-slate-400">{step.description}</p>
                </div>
                {step.number < 4 && (
                  <div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                    <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-15 blur-3xl"></div>
        </div>

        <div className="container-max text-center glass-lg p-12">
          <h2 className="text-5xl font-bold gradient-text mb-6">Ready to transform your academic experience?</h2>
          <p className="text-xl text-slate-300 mb-10">Join thousands of students and faculty using our platform.</p>
          <Link to="/signup" className="btn-primary text-lg">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
