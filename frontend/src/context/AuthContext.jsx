import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eb_user')); }
    catch { return null; }
  });

  const login = useCallback((token, userData) => {
    localStorage.setItem('eb_token', token);
    localStorage.setItem('eb_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('eb_token');
    localStorage.removeItem('eb_user');
    setUser(null);
  }, []);

  const isOrganizer = () => user?.role === 'Organizer';
  const isCustomer  = () => user?.role === 'Customer';

  return (
    <AuthContext.Provider value={{ user, login, logout, isOrganizer, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
