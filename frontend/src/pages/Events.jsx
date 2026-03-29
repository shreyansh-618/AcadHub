import { useState } from 'react';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

export default function Events() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingEvents = [
    {
      id: 1,
      title: 'Web Development Workshop',
      date: '2024-02-15',
      time: '10:00 AM',
      location: 'Room 101, Building A',
      category: 'Workshop',
      attendees: 45,
      description: 'Learn modern web development with React and Node.js. Perfect for beginners and intermediate developers.',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
    },
    {
      id: 2,
      title: 'Data Science Seminar',
      date: '2024-02-18',
      time: '2:00 PM',
      location: 'Auditorium',
      category: 'Seminar',
      attendees: 120,
      description: 'Explore machine learning and data analysis techniques with industry experts.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop',
    },
    {
      id: 3,
      title: 'Cloud Computing Bootcamp',
      date: '2024-02-20',
      time: '9:00 AM',
      location: 'Online (Zoom)',
      category: 'Bootcamp',
      attendees: 85,
      description: 'Intensive training on AWS, Azure, and Google Cloud platforms. Multi-day event.',
      image: 'https://images.unsplash.com/photo-1516534775068-bb57f50cffb1?w=500&h=300&fit=crop',
    },
    {
      id: 4,
      title: 'Cybersecurity Conference',
      date: '2024-02-22',
      time: '1:00 PM',
      location: 'Main Hall',
      category: 'Conference',
      attendees: 200,
      description: 'Latest trends and best practices in cybersecurity. Network with professionals.',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&h=300&fit=crop',
    },
  ];

  const pastEvents = [
    {
      id: 5,
      title: 'Python Fundamentals Workshop',
      date: '2024-02-01',
      time: '11:00 AM',
      location: 'Lab Room 5',
      category: 'Workshop',
      attendees: 65,
      description: 'Introduction to Python programming. Great for beginners.',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
    },
    {
      id: 6,
      title: 'AI Trends Panel Discussion',
      date: '2024-01-30',
      time: '3:00 PM',
      location: 'Conference Room',
      category: 'Panel',
      attendees: 150,
      description: 'Industry leaders discuss the future of artificial intelligence.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop',
    },
  ];

  const events = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  const getCategoryColor = (category) => {
    const colors = {
      Workshop: 'bg-blue-100 text-blue-800',
      Seminar: 'bg-purple-100 text-purple-800',
      Bootcamp: 'bg-orange-100 text-orange-800',
      Conference: 'bg-pink-100 text-pink-800',
      Panel: 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="page-shell">
      <div className="container-max">
        {/* Header */}
        <div className="glass-panel mb-12 p-8">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
            Upcoming Events
          </h1>
          <p className="text-slate-600 text-sm md:text-base">
            Stay updated with the latest workshops, seminars, and conferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === 'upcoming'
                ? 'text-slate-900 border-b-2 border-slate-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Upcoming Events
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === 'past'
                ? 'text-slate-900 border-b-2 border-slate-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Past Events
          </button>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white/75 shadow-[0_18px_50px_rgba(91,101,118,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(91,101,118,0.14)]"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden bg-slate-200 md:h-40">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-900/10 transition-all duration-300 group-hover:bg-slate-900/5" />
                <span className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full ${getCategoryColor(event.category)} dark:${getCategoryColor(event.category)}`}>
                  {event.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="mb-3 line-clamp-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-slate-700">
                  {event.title}
                </h3>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-sm text-slate-600">
                  {event.description}
                </p>

                {/* Details */}
                <div className="mb-4 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>{event.attendees} attendees</span>
                  </div>
                </div>

                {/* Actions */}
                <button className="w-full btn-primary text-sm py-2">
                  {activeTab === 'upcoming' ? 'Register Now' : 'View Details'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-600 text-lg">No events found</div>
          </div>
        )}

        {/* CTA Section */}
        <div className="glass-lg mt-16 p-8 text-center md:p-12">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
            Want to host an event?
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-slate-600">
            Share your knowledge and connect with fellow students. Submit your event proposal today.
          </p>
          <button className="btn-primary">
            Submit Event Proposal
          </button>
        </div>
      </div>
    </div>
  );
}
