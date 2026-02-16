import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/services/api";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    department: "",
    subject: "",
    category: "",
    semester: 1,
  });
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : [];
  });

  const departments = [
    "Computer Science",
    "Electronics",
    "Mechanical",
    "Civil",
    "Electrical",
    "Chemical",
  ];
  const subjects = [
    "Data Structures",
    "Algorithms",
    "DBMS",
    "Web Development",
    "AI/ML",
    "Cloud Computing",
  ];
  const categories = ["Notes", "Assignment", "Solution", "Paper"];

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);

    try {
      // Call backend semantic search API
      const response = await apiClient.post("/search/semantic", {
        query: searchQuery,
        filters,
        limit: 12,
      });

      setResults(response.data.resources || []);

      // Add to recent searches
      const newRecent = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("recentSearches", JSON.stringify(newRecent));

      if (response.data.resources?.length === 0) {
        toast.error("No resources found. Try different keywords.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
  };

  return (
    <div className="min-h-screen py-12">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="container-max">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-text mb-3">
            Semantic Search
          </h1>
          <p className="text-slate-300 text-lg">
            Find resources using AI-powered semantic understanding
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSearch}
          className="glass-lg p-8 mb-8 sticky top-4 z-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for resources, topics, assignments..."
                className="input-field w-full text-base"
              />
            </div>

            {/* Department Filter */}
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters({ ...filters, department: e.target.value })
              }
              className="input-field"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 w-full"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Subject Filter */}
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters({ ...filters, subject: e.target.value })
              }
              className="input-field text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="input-field text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Semester Filter */}
            <select
              value={filters.semester}
              onChange={(e) =>
                setFilters({ ...filters, semester: parseInt(e.target.value) })
              }
              className="input-field text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-3">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  className="badge badge-primary hover:bg-blue-400 hover:bg-opacity-40 cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {searchQuery && (
          <div>
            <div className="mb-6">
              <p className="text-slate-300">
                {loading
                  ? "Searching..."
                  : `Found ${results.length} result${results.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Results Grid */}
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((resource) => (
                  <div
                    key={resource._id}
                    className="card-interactive group"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4 flex items-center justify-center group-hover:shadow-lg">
                      <span className="text-white text-4xl">📄</span>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {resource.title}
                    </h3>

                    <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                      {resource.description}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="badge badge-primary text-xs">
                        {resource.category}
                      </span>
                      <span className="badge badge-secondary text-xs">
                        {resource.department}
                      </span>
                      <span className="badge badge-success text-xs">
                        Sem {resource.semester}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>📅 {new Date(resource.createdAt).toLocaleDateString()}</span>
                      <button className="text-blue-400 hover:text-blue-300 font-semibold">
                        View →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-slate-200 mb-2">
                  No Results Found
                </h3>
                <p className="text-slate-400 mb-6">
                  Try adjusting your search query or filters
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setResults([]);
                    setFilters({
                      department: "",
                      subject: "",
                      category: "",
                      semester: 1,
                    });
                  }}
                  className="btn-secondary"
                >
                  Clear Search
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && results.length === 0 && (
          <div className="text-center py-20">
            <div className="text-8xl mb-6 float">🚀</div>
            <h2 className="text-3xl font-bold gradient-text mb-3">
              Ready to Search?
            </h2>
            <p className="text-slate-300 text-lg max-w-md mx-auto">
              Use the search bar above to find resources that match your needs.
              Our AI understands context and meaning, not just keywords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
