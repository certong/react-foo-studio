import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/state/session';
import { routes } from '@/routes';

/** Guards signed-in pages. A remembered device goes to Welcome back (PIN), otherwise Sign in. */
export function RequireAuth() {
  const { signedIn, remembered } = useSession();
  const location = useLocation();
  if (signedIn) return <Outlet />;
  return <Navigate to={remembered ? routes.welcome : routes.signIn} replace state={{ from: location.pathname }} />;
}
