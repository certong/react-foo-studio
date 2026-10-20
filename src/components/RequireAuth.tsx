import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/state/session';
import { routes } from '@/routes';

/**
 * Guards signed-in pages. Waits for the session check on load, then sends signed-out visitors to
 * Welcome back (PIN only) on a remembered device, otherwise to Sign in.
 */
export function RequireAuth() {
  const { status, remembered } = useSession();
  const location = useLocation();
  if (status === 'checking') return <p className="visually-hidden" role="status">Checking your session…</p>;
  if (status === 'signed-in') return <Outlet />;
  return <Navigate to={remembered ? routes.welcome : routes.signIn} replace state={{ from: location.pathname }} />;
}
