import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/** Guard for /admin/*. The API enforces authorization on every request; this keeps signed-out users on /login. */
export function RequireAuth({ children }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search, reason: 'auth' }} />;
  return children;
}

/** Public auth pages redirect signed-in admins to the dashboard. */
export function GuestOnly({ children }) {
  const { session } = useAuth();
  const { state } = useLocation();
  if (session) return <Navigate to={state?.from && state.from.startsWith('/admin') ? state.from : '/admin/dashboard'} replace />;
  return children;
}
