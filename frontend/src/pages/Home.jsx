import { Link } from "react-router-dom";
import { BookOpen, Calendar, FileSearch, MessageSquare, Upload } from "lucide-react";

const features = [
  {
    title: "Search by topic",
    description:
      "Find notes, slides, and question papers with filters for subject, semester, and category.",
    icon: FileSearch,
  },
  {
    title: "Keep resources in one place",
    description:
      "Upload study material once and open it from web or mobile without hunting through chats and folders.",
    icon: Upload,
  },
  {
    title: "Ask questions inside a resource",
    description:
      "Use the Ask AI button on a resource when you want an answer tied to that document.",
    icon: BookOpen,
  },
  {
    title: "Discuss with classmates",
    description:
      "Use discussions to ask for help, share updates, and keep course-specific conversations together.",
    icon: MessageSquare,
  },
  {
    title: "Track upcoming events",
    description:
      "See workshops, deadlines, and department events without switching to another app.",
    icon: Calendar,
  },
];

export default function HomePage() {
  return (
    <div className="page-shell pt-16">
      <div className="container-max">
        <section className="section-spacing">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-14">
            <span className="badge badge-primary mb-5">Shared study space</span>
            <h1 className="max-w-3xl text-4xl font-bold text-slate-900 sm:text-5xl">
              Keep your notes, resources, and questions in one place.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
              AcadHub helps students find useful material faster, read it in one place,
              and ask document-based questions when they need help understanding a topic.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search" className="btn-primary">
                Search resources
              </Link>
              <Link to="/signup" className="btn-outline">
                Create account
              </Link>
            </div>
          </div>
        </section>

        <section className="section-spacing">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-bold text-slate-900">What you can do here</h2>
            <p className="mt-3 text-slate-600">
              The product is built around a few basic things students actually do every
              day: search, upload, read, ask, and share.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="card-interactive">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon size={20} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-spacing">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card">
              <h2 className="text-2xl font-bold text-slate-900">How the AI part works</h2>
              <p className="mt-3 text-slate-600">
                The assistant is most useful when you open a resource first and then ask a
                question from that screen. That way the answer stays tied to the document
                you are reading.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li>Open a resource.</li>
                <li>Use the Ask AI section on that page.</li>
                <li>Ask one clear question at a time.</li>
                <li>Check the cited source snippets before you rely on the answer.</li>
              </ul>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold text-slate-900">Start with the basics</h2>
              <p className="mt-3 text-slate-600">
                If you are new here, the fastest way to get value is simple.
              </p>
              <ol className="mt-5 space-y-3 text-sm text-slate-600">
                <li>1. Search for a subject or topic.</li>
                <li>2. Open a useful file and read the summary or preview.</li>
                <li>3. Upload your own notes if you want them available later.</li>
                <li>4. Save discussions and events for your course work.</li>
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
