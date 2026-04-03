import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, Calendar, Users, ChevronLeft, ShoppingCart } from 'lucide-react';

const fmt = (dt) =>
  new Date(dt).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const categoryColors = {
  VIP:      { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  Premium:  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  General:  { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  Economy:  { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
};

const catStyle = (cat) => categoryColors[cat] || { bg: 'rgba(160,168,192,0.1)', color: '#a0a8c0' };

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/events/${id}`), api.get(`/events/${id}/tickets`)])
      .then(([evRes, tkRes]) => {
        setEvent(evRes.data);
        setTickets(tkRes.data);
      })
      .catch(() => setError('Failed to load event details'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleTicket = (ticket) => {
    if (ticket.Status === 'Booked') return;
    setSelected((prev) =>
      prev.includes(ticket.TicketID)
        ? prev.filter((id) => id !== ticket.TicketID)
        : [...prev, ticket.TicketID]
    );
  };

  const total = tickets
    .filter((t) => selected.includes(t.TicketID))
    .reduce((sum, t) => sum + parseFloat(t.BasePrice), 0);

  const handleBook = async () => {
    if (!user) return navigate('/login');
    if (user.role !== 'Customer') return setError('Only customers can book tickets.');
    if (selected.length === 0) return setError('Please select at least one ticket.');
    setBooking(true);
    setError('');
    try {
      const res = await api.post('/bookings', { ticketIds: selected });
      navigate(`/booking/${res.data.BookingID}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><span>Loading…</span></div>;
  if (!event) return <div className="page-wrapper"><div className="alert alert-danger">{error || 'Event not found'}</div></div>;

  const categories = [...new Set(tickets.map((t) => t.Category))];

  return (
    <div className="page-wrapper">
      <button className="btn btn-outline btn-sm" style={{ marginBottom:'1.5rem' }} onClick={() => navigate('/events')}>
        <ChevronLeft size={15} /> Back to Events
      </button>

      {/* Event Header */}
      <div className="card" style={{ marginBottom:'1.5rem', background:'linear-gradient(135deg, #1a1060 0%, #0d1a40 100%)', border:'1px solid var(--accent-dark)' }}>
        <div style={{ marginBottom:'0.75rem' }}>
          <span className="badge badge-accent">{event.EventStatus}</span>
        </div>
        <h1 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'1rem' }}>{event.Title}</h1>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'1.5rem' }}>
          <div className="event-card-info"><Calendar size={15} color="var(--accent-light)" /><span>{fmt(event.EventDateTime)}</span></div>
          <div className="event-card-info"><MapPin size={15} color="var(--accent-light)" /><span>{event.VenueName}{event.City ? `, ${event.City}` : ''}{event.State ? `, ${event.State}` : ''}</span></div>
          <div className="event-card-info"><Users size={15} color="var(--accent-light)" /><span>Capacity: {event.Capacity ?? 'N/A'}</span></div>
        </div>
        <div style={{ marginTop:'0.75rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>
          Organized by <strong style={{ color:'var(--text-secondary)' }}>{event.OrganizationName}</strong>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'1.5rem', alignItems:'start' }}>

        {/* Ticket Grid */}
        <div>
          <div className="section-header">
            <h2>Select Tickets</h2>
            <span className="badge badge-muted">{tickets.filter((t) => t.Status === 'Available').length} available</span>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom:'1rem' }}>⚠ {error}</div>}

          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.75rem' }}>
                <span className="badge" style={catStyle(cat)}>{cat}</span>
              </div>
              <div className="tickets-grid">
                {tickets.filter((t) => t.Category === cat).map((ticket) => (
                  <div
                    key={ticket.TicketID}
                    id={`ticket-${ticket.TicketID}`}
                    className={`ticket-card ${ticket.Status === 'Booked' ? 'booked' : ''} ${selected.includes(ticket.TicketID) ? 'selected' : ''}`}
                    onClick={() => toggleTicket(ticket)}
                  >
                    <div className="ticket-seat">{ticket.SeatNumber}</div>
                    <div className="ticket-cat">{ticket.Category}</div>
                    <div className="ticket-price">${parseFloat(ticket.BasePrice).toFixed(2)}</div>
                    {ticket.Status === 'Booked' && (
                      <div style={{ fontSize:'0.68rem', color:'var(--danger)', marginTop:'0.3rem' }}>SOLD</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="empty-state">
              <h3>No tickets available</h3>
              <p>The organizer hasn't added tickets yet.</p>
            </div>
          )}
        </div>

        {/* Booking Summary */}
        <div style={{ position:'sticky', top:'80px' }}>
          <div className="summary-box">
            <h2 style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'1rem' }}>Booking Summary</h2>

            {selected.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:'0.88rem', textAlign:'center', padding:'1rem 0' }}>
                Select seats to continue
              </p>
            ) : (
              <>
                {tickets.filter((t) => selected.includes(t.TicketID)).map((t) => (
                  <div key={t.TicketID} className="summary-row">
                    <span>Seat {t.SeatNumber} ({t.Category})</span>
                    <span>${parseFloat(t.BasePrice).toFixed(2)}</span>
                  </div>
                ))}
                <div className="summary-row">
                  <span>Total ({selected.length} ticket{selected.length > 1 ? 's' : ''})</span>
                  <span style={{ color:'var(--accent-light)' }}>${total.toFixed(2)}</span>
                </div>
              </>
            )}

            <button
              id="book-now-btn"
              className="btn btn-primary btn-full"
              style={{ marginTop:'1.25rem' }}
              disabled={selected.length === 0 || booking}
              onClick={handleBook}
            >
              <ShoppingCart size={15} />
              {booking ? 'Processing…' : user ? 'Book Now' : 'Sign In to Book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
