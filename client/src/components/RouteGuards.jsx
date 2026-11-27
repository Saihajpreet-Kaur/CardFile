import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** Only signedin users get through; others go to /signin and come back afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <Spinner label="Checking your session…" />;
  if (status === 'signedOut') return <Navigate to="/signin" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Role-based access on the client: non-admins are sent to the dashboard (the API also returns 403). */
export function AdminRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/** Sign-in and sign-up pages: a signed-in user goes straight to the app. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <Spinner label="Checking your session…" />;
  return status === 'signedIn' ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
