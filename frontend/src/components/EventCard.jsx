import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Tag } from 'lucide-react';

const fmt = (dt) =>
  new Date(dt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

const fmtTime = (dt) =>
  new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function EventCard({ event }) {
  const navigate = useNavigate();

  const available = event.TotalTickets - event.BookedTickets;
  const availPct = event.TotalTickets > 0 ? (available / event.TotalTickets) * 100 : 100;

  const availColor =
    availPct === 0 ? 'var(--danger)' :
    availPct < 25 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="event-card" onClick={() => navigate(`/events/${event.EventID}`)}>
      <div className="event-card-header">
        <div className="event-card-date">{fmt(event.EventDateTime)}</div>
        <div className="event-card-title">{event.Title}</div>
      </div>

      <div className="event-card-body">
        <div className="event-card-info">
          <MapPin size={13} color="var(--accent-light)" />
          <span>{event.VenueName}{event.City ? `, ${event.City}` : ''}</span>
        </div>
        <div className="event-card-info">
          <Clock size={13} color="var(--accent-light)" />
          <span>{fmtTime(event.EventDateTime)}</span>
        </div>
        <div className="event-card-info">
          <Users size={13} color="var(--accent-light)" />
          <span style={{ color: availColor }}>
            {available} seat{available !== 1 ? 's' : ''} available
          </span>
        </div>
        <div className="event-card-info" style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
          <Tag size={12} />
          <span>{event.OrganizationName}</span>
        </div>
      </div>

      <div className="event-card-footer">
        <span className="event-price">
          {event.MinPrice != null ? `From $${parseFloat(event.MinPrice).toFixed(2)}` : 'Free'}
        </span>
        <span
          className="badge"
          style={{ background: `${availColor}20`, color: availColor }}
        >
          {availPct === 0 ? 'Sold Out' : availPct < 25 ? 'Almost Full' : 'Available'}
        </span>
      </div>
    </div>
  );
}
