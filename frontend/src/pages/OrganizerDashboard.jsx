import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Calendar, MapPin, Ticket, ChevronRight, Building } from 'lucide-react';

const fmt = (dt) =>
  new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('events'); // 'events' | 'create-event' | 'create-venue' | 'add-tickets'

  // Create Event form
  const [eventForm, setEventForm] = useState({ title: '', venueId: '', eventDateTime: '' });
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');
  const [eventSuccess, setEventSuccess] = useState('');

  // Create Venue form
  const [venueForm, setVenueForm] = useState({ name: '', street: '', city: '', state: '', zipCode: '', capacity: '' });
  const [venueLoading, setVenueLoading] = useState(false);
  const [venueError, setVenueError] = useState('');
  const [venueSuccess, setVenueSuccess] = useState('');

  // Add Tickets (bulk) form
  const CATEGORIES = ['General', 'Premium', 'VIP', 'Economy'];
  const CAT_PREFIX = { General: 'GEN', Premium: 'PREM', VIP: 'VIP', Economy: 'ECO' };
  const CAT_COLOR  = { General: 'var(--info)', Premium: 'var(--warning)', VIP: '#c084fc', Economy: 'var(--success)' };

  const [ticketForm, setTicketForm] = useState({ eventId: '', category: 'General', count: '', basePrice: '' });
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState('');

  useEffect(() => {
    Promise.all([api.get('/venues'), api.get('/events/organizer/my')])
      .then(([vRes, eRes]) => { setVenues(vRes.data); setMyEvents(eRes.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleCancelEvent = async (eventId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this event? Users will no longer be able to see or book it.')) return;
    try {
      await api.patch(`/events/${eventId}/cancel`);
      setMyEvents((prev) =>
        prev.map((ev) => (ev.EventID === eventId ? { ...ev, EventStatus: 'Cancelled' } : ev))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event');
    }
  };

  // ── Create Event ─────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setEventError(''); setEventSuccess('');
    setEventLoading(true);
    try {
      const res = await api.post('/events', {
        venueId: parseInt(eventForm.venueId),
        title: eventForm.title,
        eventDateTime: eventForm.eventDateTime,
      });
      setMyEvents((prev) => [res.data, ...prev]);
      setEventSuccess(`Event "${res.data.Title}" created successfully!`);
      setEventForm({ title: '', venueId: '', eventDateTime: '' });
    } catch (err) {
      setEventError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setEventLoading(false);
    }
  };

  // ── Create Venue ─────────────────────────────────
  const handleCreateVenue = async (e) => {
    e.preventDefault();
    setVenueError(''); setVenueSuccess('');
    setVenueLoading(true);
    try {
      const res = await api.post('/venues', {
        ...venueForm,
        capacity: venueForm.capacity ? parseInt(venueForm.capacity) : undefined,
      });
      setVenues((prev) => [...prev, res.data]);
      setVenueSuccess(`Venue "${res.data.Name}" added!`);
      setVenueForm({ name: '', street: '', city: '', state: '', zipCode: '', capacity: '' });
    } catch (err) {
      setVenueError(err.response?.data?.message || 'Failed to create venue.');
    } finally {
      setVenueLoading(false);
    }
  };

  // ── Add Tickets (bulk) ───────────────────────────────────
  const handleAddTicketsBulk = async (e) => {
    e.preventDefault();
    setTicketError(''); setTicketSuccess('');
    const n = parseInt(ticketForm.count);
    if (!n || n < 1) return setTicketError('Enter a valid seat count.');
    setTicketLoading(true);
    try {
      const res = await api.post(`/events/${ticketForm.eventId}/tickets/bulk`, {
        category: ticketForm.category,
        count: n,
        basePrice: parseFloat(ticketForm.basePrice),
      });
      setTicketSuccess(
        `✓ Added ${res.data.added} ${ticketForm.category} seat${res.data.added > 1 ? 's' : ''} (${res.data.from} → ${res.data.to})`
      );
      setTicketForm((prev) => ({ ...prev, count: '', basePrice: '' }));
    } catch (err) {
      setTicketError(err.response?.data?.message || 'Failed to add tickets.');
    } finally {
      setTicketLoading(false);
    }
  };

  const tabs = [
    { key: 'events', label: 'My Events' },
    { key: 'create-event', label: '+ New Event' },
    { key: 'create-venue', label: '+ New Venue' },
    { key: 'add-tickets', label: '+ Add Tickets' },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Organizer Dashboard</h1>
        <p>Welcome back, {user?.firstName}! Manage your events and venues.</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className="nav-link"
            style={{
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              color: tab === t.key ? 'var(--accent-light)' : 'var(--text-secondary)',
              paddingBottom: '0.75rem',
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── My Events Tab ── */}
      {tab === 'events' && (
        <>
          {loading && <div className="loading-wrapper"><div className="spinner" /></div>}
          {!loading && myEvents.length === 0 && (
            <div className="empty-state">
              <Calendar size={48} />
              <h3>No events yet</h3>
              <p>Create your first event to get started.</p>
              <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={() => setTab('create-event')}>
                <Plus size={14} /> Create Event
              </button>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {myEvents.map((ev) => (
              <div
                key={ev.EventID}
                className="card"
                style={{ display:'flex', alignItems:'center', gap:'1rem', cursor:'pointer', padding:'1rem 1.25rem', opacity: ev.EventStatus === 'Cancelled' ? 0.6 : 1 }}
                onClick={() => navigate(`/events/${ev.EventID}`)}
              >
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, marginBottom:'0.25rem', textDecoration: ev.EventStatus === 'Cancelled' ? 'line-through' : 'none' }}>{ev.Title}</div>
                  <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                    <span className="event-card-info" style={{ fontSize:'0.82rem' }}><Calendar size={12} color="var(--accent-light)" />{fmt(ev.EventDateTime)}</span>
                    <span className="event-card-info" style={{ fontSize:'0.82rem' }}><MapPin size={12} color="var(--accent-light)" />{ev.VenueName}{ev.City ? `, ${ev.City}` : ''}</span>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                    <Ticket size={12} style={{ display:'inline', marginRight:4 }} />
                    {ev.BookedTickets}/{ev.TotalTickets} sold
                  </div>
                  <span className={`badge ${ev.EventStatus === 'Active' ? 'badge-success' : 'badge-danger'}`}>{ev.EventStatus}</span>
                </div>
                {ev.EventStatus === 'Active' ? (
                  <button 
                    className="badge badge-danger" 
                    style={{ border: 'none', cursor: 'pointer', padding: '0.4rem 0.6rem' }} 
                    onClick={(e) => handleCancelEvent(ev.EventID, e)}
                  >
                    Cancel
                  </button>
                ) : (
                  <ChevronRight size={16} color="var(--text-muted)" />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create Event Tab ── */}
      {tab === 'create-event' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'1.5rem' }}>
            <Calendar size={16} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
            Create New Event
          </h2>
          {eventError && <div className="alert alert-danger">⚠ {eventError}</div>}
          {eventSuccess && <div className="alert alert-success">✓ {eventSuccess}</div>}
          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label htmlFor="ev-title">Event Title</label>
              <input id="ev-title" placeholder="e.g. Summer Music Festival" value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="ev-venue">Venue</label>
              <select id="ev-venue" value={eventForm.venueId}
                onChange={(e) => setEventForm({ ...eventForm, venueId: e.target.value })} required>
                <option value="">— Select a venue —</option>
                {venues.map((v) => (
                  <option key={v.VenueID} value={v.VenueID}>
                    {v.Name}{v.City ? ` – ${v.City}` : ''}
                  </option>
                ))}
              </select>
              {venues.length === 0 && <p className="form-error">No venues yet. <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft:8 }} onClick={() => setTab('create-venue')}>Add Venue</button></p>}
            </div>
            <div className="form-group">
              <label htmlFor="ev-datetime">Date & Time</label>
              <input id="ev-datetime" type="datetime-local" value={eventForm.eventDateTime}
                onChange={(e) => setEventForm({ ...eventForm, eventDateTime: e.target.value })} required />
            </div>
            <button id="create-event-btn" type="submit" className="btn btn-primary btn-full" disabled={eventLoading}>
              {eventLoading ? 'Creating…' : 'Create Event'}
            </button>
          </form>
        </div>
      )}

      {/* ── Create Venue Tab ── */}
      {tab === 'create-venue' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'1.5rem' }}>
            <Building size={16} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
            Add New Venue
          </h2>
          {venueError && <div className="alert alert-danger">⚠ {venueError}</div>}
          {venueSuccess && <div className="alert alert-success">✓ {venueSuccess}</div>}
          <form onSubmit={handleCreateVenue}>
            <div className="form-group">
              <label htmlFor="v-name">Venue Name</label>
              <input id="v-name" placeholder="Grand Arena" value={venueForm.name}
                onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="v-street">Street Address</label>
              <input id="v-street" placeholder="123 Main St" value={venueForm.street}
                onChange={(e) => setVenueForm({ ...venueForm, street: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="v-city">City</label>
                <input id="v-city" placeholder="New York" value={venueForm.city}
                  onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="v-state">State</label>
                <input id="v-state" placeholder="NY" value={venueForm.state}
                  onChange={(e) => setVenueForm({ ...venueForm, state: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="v-zip">Zip Code</label>
                <input id="v-zip" placeholder="10001" value={venueForm.zipCode}
                  onChange={(e) => setVenueForm({ ...venueForm, zipCode: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="v-cap">Capacity</label>
                <input id="v-cap" type="number" placeholder="500" value={venueForm.capacity}
                  onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })} />
              </div>
            </div>
            <button id="create-venue-btn" type="submit" className="btn btn-primary btn-full" disabled={venueLoading}>
              {venueLoading ? 'Saving…' : 'Add Venue'}
            </button>
          </form>
        </div>
      )}

      {/* ── Add Tickets (Bulk) Tab ── */}
      {tab === 'add-tickets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Form */}
          <div className="card">
            <h2 style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'0.4rem' }}>
              <Ticket size={16} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Add Seats in Bulk
            </h2>
            <p style={{ fontSize:'0.83rem', color:'var(--text-muted)', marginBottom:'1.5rem' }}>
              Seats are auto-numbered per category (e.g. VIP-1, VIP-2…)
            </p>

            {ticketError && <div className="alert alert-danger">⚠ {ticketError}</div>}
            {ticketSuccess && <div className="alert alert-success">{ticketSuccess}</div>}

            <form onSubmit={handleAddTicketsBulk}>
              <div className="form-group">
                <label htmlFor="tk-event">Event</label>
                <select id="tk-event" value={ticketForm.eventId}
                  onChange={(e) => setTicketForm({ ...ticketForm, eventId: e.target.value })} required>
                  <option value="">— Select your event —</option>
                  {myEvents.map((ev) => (
                    <option key={ev.EventID} value={ev.EventID}>{ev.Title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tk-cat">Seat Category</label>
                <select id="tk-cat" value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tk-count">Number of Seats</label>
                  <input
                    id="tk-count"
                    type="number" min="1" max="500" placeholder="e.g. 50"
                    value={ticketForm.count}
                    onChange={(e) => setTicketForm({ ...ticketForm, count: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tk-price">Price per Seat ($)</label>
                  <input
                    id="tk-price"
                    type="number" step="0.01" min="0" placeholder="49.99"
                    value={ticketForm.basePrice}
                    onChange={(e) => setTicketForm({ ...ticketForm, basePrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button id="add-tickets-bulk-btn" type="submit" className="btn btn-primary btn-full" disabled={ticketLoading}>
                {ticketLoading
                  ? 'Generating seats…'
                  : `Add ${ticketForm.count || '—'} ${ticketForm.category} Seat${parseInt(ticketForm.count) !== 1 ? 's' : ''}`
                }
              </button>
            </form>
          </div>

          {/* Live Preview */}
          <div className="card" style={{ minHeight: 240 }}>
            <h3 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1rem', color:'var(--text-secondary)' }}>
              Seat Preview
            </h3>
            {!ticketForm.count || parseInt(ticketForm.count) < 1 ? (
              <p style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                Fill in the form to preview the seats that will be created.
              </p>
            ) : (
              <>
                <div style={{ marginBottom:'0.75rem', fontSize:'0.83rem', color:'var(--text-muted)' }}>
                  {parseInt(ticketForm.count)} seats · {ticketForm.category} · {ticketForm.basePrice ? `$${parseFloat(ticketForm.basePrice).toFixed(2)} each` : 'price TBD'}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', maxHeight:220, overflowY:'auto' }}>
                  {Array.from({ length: Math.min(parseInt(ticketForm.count) || 0, 60) }).map((_, i) => (
                    <span
                      key={i}
                      className="badge"
                      style={{
                        background: `${CAT_COLOR[ticketForm.category]}20`,
                        color: CAT_COLOR[ticketForm.category],
                        fontSize: '0.72rem',
                      }}
                    >
                      {CAT_PREFIX[ticketForm.category]}-{i + 1}
                    </span>
                  ))}
                  {parseInt(ticketForm.count) > 60 && (
                    <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', alignSelf:'center' }}>
                      +{parseInt(ticketForm.count) - 60} more…
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
