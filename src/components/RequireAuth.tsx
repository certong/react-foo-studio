import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/state/session';
import { routes } from '@/routes';

/** Guards signed-in pages. Waits for the session check on load, then sends signed-out visitors to Sign in. */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'checking') return <p className="visually-hidden" role="status">Checking your session…</p>;
  if (status === 'signed-in') return <Outlet />;
  return <Navigate to={routes.signIn} replace state={{ from: location.pathname }} />;
}
