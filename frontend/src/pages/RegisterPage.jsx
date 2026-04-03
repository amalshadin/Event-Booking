import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Ticket } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    confirmPassword: '', role: 'Customer', phone: '', organizationName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || undefined,
        organizationName: form.role === 'Organizer' ? form.organizationName : undefined,
      };
      const res = await api.post('/auth/register', payload);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'Organizer' ? '/dashboard' : '/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <Ticket size={32} color="var(--accent-light)" style={{ margin: '0 auto 0.5rem' }} />
          <span>EventBook</span>
          <p>Create a new account</p>
        </div>

        {error && <div className="alert alert-danger">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-first">First Name</label>
              <input id="reg-first" name="firstName" placeholder="John" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-last">Last Name</label>
              <input id="reg-last" name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input id="reg-email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" name="password" placeholder="Min. 6 chars" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" type="password" name="confirmPassword" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-role">Account Type</label>
              <select id="reg-role" name="role" value={form.role} onChange={handleChange}>
                <option value="Customer">Customer</option>
                <option value="Organizer">Organizer</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reg-phone">Phone (optional)</label>
              <input id="reg-phone" name="phone" placeholder="+1 555 000 0000" value={form.phone} onChange={handleChange} />
            </div>
          </div>

          {form.role === 'Organizer' && (
            <div className="form-group">
              <label htmlFor="reg-org">Organization Name</label>
              <input id="reg-org" name="organizationName" placeholder="Your company or org" value={form.organizationName} onChange={handleChange} />
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
