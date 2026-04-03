import { useEffect, useState } from 'react';
import api from '../api/axios';
import EventCard from '../components/EventCard';
import { Search, Calendar } from 'lucide-react';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/events')
      .then((res) => { setEvents(res.data); setFiltered(res.data); })
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      events.filter(
        (e) =>
          e.Title.toLowerCase().includes(q) ||
          e.VenueName?.toLowerCase().includes(q) ||
          e.City?.toLowerCase().includes(q) ||
          e.OrganizationName?.toLowerCase().includes(q)
      )
    );
  }, [search, events]);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Upcoming Events</h1>
        <p>Discover and book tickets for the best events near you.</p>
      </div>

      <div className="search-bar">
        <Search size={18} color="var(--text-muted)" />
        <input
          id="event-search"
          placeholder="Search events, venues, cities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="loading-wrapper">
          <div className="spinner" />
          <span>Loading events…</span>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && filtered.length === 0 && !error && (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>No events found</h3>
          <p>Try a different search term or check back later.</p>
        </div>
      )}

      <div className="events-grid">
        {filtered.map((ev) => (
          <EventCard key={ev.EventID} event={ev} />
        ))}
      </div>
    </div>
  );
}
