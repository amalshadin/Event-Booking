import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, LayoutDashboard, LogOut, LogIn } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}`.toUpperCase()
    : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => navigate('/events')}>
          <Ticket size={18} style={{ display:'inline', marginRight:'6px', verticalAlign:'middle' }} />
          EventBook
        </div>

        <div className="navbar-nav">
          <button
            className={`nav-link ${isActive('/events') ? 'active' : ''}`}
            onClick={() => navigate('/events')}
          >
            <Calendar size={15} style={{ display:'inline', marginRight:'4px', verticalAlign:'middle' }} />
            Events
          </button>

          {user?.role === 'Organizer' && (
            <button
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard size={15} style={{ display:'inline', marginRight:'4px', verticalAlign:'middle' }} />
              Dashboard
            </button>
          )}

          {user ? (
            <div className="nav-user">
              <div className="nav-avatar">{initials}</div>
              <span style={{ display:'none' }}>{user.firstName}</span>
              <button className="nav-link" onClick={handleLogout} title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
