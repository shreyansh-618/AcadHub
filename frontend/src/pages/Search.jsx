import { useState } from "react";
import { Link } from "react-router-dom";
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
    semester: "",
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
  const categories = [
    { label: "Lecture Notes", value: "lecture-notes" },
    { label: "Textbooks", value: "textbooks" },
    { label: "Question Papers", value: "question-papers" },
    { label: "Assignments", value: "assignments" },
    { label: "Other", value: "other" },
  ];

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/search/semantic", {
        query: searchQuery,
        filters,
        limit: 12,
      });

      const resources =
        response.data.data?.resources || response.data.resources || [];
      const normalizedResources = resources.map((resource) => ({
        ...resource,
        _id: resource._id || resource.id,
      }));
      setResults(normalizedResources);

      apiClient
        .post("/analytics/track", {
          type: "search",
          topicName: filters.subject || null,
          searchQuery,
          metadata: {
            subject: filters.subject || null,
            category: filters.category || null,
            department: filters.department || null,
            semester: filters.semester || null,
            deviceType: "web",
          },
        })
        .catch(() => {});

      const newRecent = [
        searchQuery,
        ...recentSearches.filter((term) => term !== searchQuery),
      ].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("recentSearches", JSON.stringify(newRecent));

      if (normalizedResources.length === 0) {
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
    <div className="page-shell py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-1/4 top-10 h-80 w-80 rounded-full bg-slate-300/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-slate-200/35 blur-3xl" />
      </div>

      <div className="container-max">
        <div className="mb-12">
          <h1 className="mb-3 text-5xl font-bold gradient-text">Semantic Search</h1>
          <p className="text-lg text-slate-600">
            Find resources using AI-powered semantic understanding
          </p>
        </div>

        <form onSubmit={handleSearch} className="glass-lg sticky top-20 z-10 mb-8 p-8">
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for resources, topics, assignments..."
                className="input-field w-full text-base"
              />
            </div>

            <select
              value={filters.department}
              onChange={(e) =>
                setFilters({ ...filters, department: e.target.value })
              }
              className="input-field"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters({ ...filters, subject: e.target.value })
              }
              className="input-field text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="input-field text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={filters.semester}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  semester: e.target.value ? parseInt(e.target.value) : "",
                })
              }
              className="input-field text-sm"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>
        </form>

        {!searchQuery && recentSearches.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-3">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  className="badge badge-primary cursor-pointer hover:bg-slate-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {searchQuery && (
          <div>
            <div className="mb-6">
              <p className="text-slate-600">
                {loading
                  ? "Searching..."
                  : `Found ${results.length} result${results.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {results.map((resource) => (
                  <Link
                    key={resource._id}
                    to={`/resources/${resource._id}`}
                    className="card-interactive group block"
                  >
                    <div className="mb-4 flex h-40 w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,rgba(214,219,226,0.92),rgba(245,246,247,0.96))]">
                      <span className="text-4xl text-slate-700">DOC</span>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900">
                      {resource.title}
                    </h3>

                    <p className="mb-3 line-clamp-2 text-sm text-slate-600">
                      {resource.description}
                    </p>

                    <div className="mb-4 flex flex-wrap gap-2">
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

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {resource.createdAt
                          ? new Date(resource.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                      <span className="font-semibold text-slate-700 transition-colors group-hover:text-slate-900">
                        View →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : !loading ? (
              <div className="glass-lg py-16 text-center">
                <div className="mb-4 text-6xl">⌕</div>
                <h3 className="mb-2 text-2xl font-bold text-slate-900">
                  No Results Found
                </h3>
                <p className="mb-6 text-slate-600">
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
                      semester: "",
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

        {!searchQuery && results.length === 0 && (
          <div className="glass-lg py-20 text-center">
            <div className="mb-6 text-7xl">⌕</div>
            <h2 className="mb-3 text-3xl font-bold gradient-text">
              Ready to Search?
            </h2>
            <p className="mx-auto max-w-md text-lg text-slate-600">
              Use the search bar above to find resources that match your needs.
              The assistant understands context and meaning, not just keywords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
