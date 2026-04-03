import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import BookingPage from './pages/BookingPage';
import OrganizerDashboard from './pages/OrganizerDashboard';

// Protected route wrapper
const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/events" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={user?.role === 'Organizer' ? '/dashboard' : '/events'} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route
          path="/booking/:bookingId"
          element={<ProtectedRoute role="Customer"><BookingPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute role="Organizer"><OrganizerDashboard /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
