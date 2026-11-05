import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from './ui.jsx';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="mx-auto max-w-xl px-4"><Loading /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

/** Only allow internal paths as redirect targets (prevents open redirects). */
export const safeNext = (value, fallback = '/app') => (value && value.startsWith('/') && !value.startsWith('//') ? value : fallback);
