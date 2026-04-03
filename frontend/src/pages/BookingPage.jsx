import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle, CreditCard, Ticket, MapPin, Calendar, Clock, ChevronLeft } from 'lucide-react';

const fmt = (dt) =>
  new Date(dt).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer'];

export default function BookingPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [method, setMethod] = useState('Credit Card');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`)
      .then((bRes) => {
        setBooking(bRes.data);
        // Try to fetch existing payment — it's OK if there isn't one yet
        return api.get(`/payments/${bookingId}`).catch(() => null);
      })
      .then((pRes) => {
        if (pRes && pRes.data) {
          setPayment(pRes.data);
          if (pRes.data.PaymentStatus === 'Completed') setSuccess(true);
        }
      })
      .catch(() => setError('Failed to load booking.'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handlePay = async () => {
    setPayLoading(true);
    setError('');
    try {
      const res = await api.post('/payments', {
        bookingId: parseInt(bookingId),
        paymentMethod: method,
        amountPaid: booking.totalAmount,
      });
      setPayment(res.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed.');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><span>Loading booking…</span></div>;
  if (error && !booking) return <div className="page-wrapper"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="page-wrapper" style={{ maxWidth: 720 }}>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: '1.5rem' }} onClick={() => navigate('/events')}>
        <ChevronLeft size={15} /> Back to Events
      </button>

      {success ? (
        /* ── Success State ── */
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={56} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.5rem' }}>
            Booking Confirmed!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Your tickets have been booked and payment received.
          </p>
          <div className="summary-box" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div className="summary-row"><span>Booking ID</span><span>#{booking.bookingId}</span></div>
            <div className="summary-row"><span>Event</span><span>{booking.event.title}</span></div>
            <div className="summary-row"><span>Venue</span><span>{booking.event.venue.name}</span></div>
            <div className="summary-row"><span>Payment Method</span><span>{payment?.PaymentMethod}</span></div>
            <div className="summary-row"><span>Amount Paid</span><span style={{ color: 'var(--success)' }}>${parseFloat(booking.totalAmount).toFixed(2)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/events')}>Browse More Events</button>
        </div>
      ) : (
        <>
          {/* ── Booking Details ── */}
          <div className="page-header">
            <h1>Complete Your Booking</h1>
            <p>Review your selection and proceed to payment</p>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div className="event-card-info" style={{ marginBottom: '0.5rem' }}>
                <Calendar size={14} color="var(--accent-light)" />
                <strong>{booking.event.title}</strong>
              </div>
              <div className="event-card-info" style={{ marginBottom: '0.5rem' }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-secondary)' }}>{fmt(booking.event.eventDateTime)}</span>
              </div>
              <div className="event-card-info">
                <MapPin size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {booking.event.venue.name}{booking.event.venue.city ? `, ${booking.event.venue.city}` : ''}
                </span>
              </div>
            </div>

            <hr className="divider" />

            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              <Ticket size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
              Selected Tickets
            </h3>
            {booking.items.map((item) => (
              <div key={item.ticketId} className="summary-row">
                <span>Seat {item.seatNumber} — <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{item.category}</span></span>
                <span>${parseFloat(item.soldPrice).toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-row">
              <span>Total</span>
              <span style={{ color: 'var(--accent-light)', fontSize: '1.1rem' }}>${parseFloat(booking.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* ── Payment Section ── */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              <CreditCard size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Payment
            </h2>

            {error && <div className="alert alert-danger">⚠ {error}</div>}

            <div className="form-group">
              <label htmlFor="payment-method">Payment Method</label>
              <select id="payment-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="summary-row" style={{ margin: '0.5rem 0 1.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount to pay</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-light)' }}>
                ${parseFloat(booking.totalAmount).toFixed(2)}
              </span>
            </div>

            <button
              id="pay-now-btn"
              className="btn btn-success btn-full btn-lg"
              onClick={handlePay}
              disabled={payLoading}
            >
              <CreditCard size={16} />
              {payLoading ? 'Processing…' : `Pay $${parseFloat(booking.totalAmount).toFixed(2)}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
