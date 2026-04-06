import React, { useState } from 'react';
import { MessageSquare, X, Star, CheckCircle } from 'lucide-react';
import api from '../api/axios';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0 || !comments.trim()) return;
    
    setStatus('loading');
    try {
      await api.post('/feedback', { rating, comments });
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => setStatus('idle'), 300);
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '0.8rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <MessageSquare size={18} />
          Feedback
        </button>
      )}

      {/* Popup Window */}
      {isOpen && (
        <div style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: '12px',
          width: '320px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          border: '1px solid var(--border)'
        }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ margin: 0, color: 'var(--success)' }}>Thank You!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Your feedback has been saved securely.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>We'd love your feedback</h3>
                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={28}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      fill={star <= (hovered || rating) ? '#fbbf24' : 'transparent'}
                      color={star <= (hovered || rating) ? '#fbbf24' : 'var(--text-muted)'}
                      style={{ cursor: 'pointer', transition: 'all 0.1s' }}
                    />
                  ))}
                </div>

                <div className="form-group">
                  <textarea 
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="How is your experience with the app?"
                    rows={4}
                    style={{ width: '100%', resize: 'none' }}
                    required
                  />
                </div>

                {status === 'error' && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', paddingBottom: '0.5rem' }}>
                    Failed to submit feedback. Ensure API is online.
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary btn-full"
                  disabled={rating === 0 || !comments.trim() || status === 'loading'}
                >
                  {status === 'loading' ? 'Saving to Database...' : 'Submit Review'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
