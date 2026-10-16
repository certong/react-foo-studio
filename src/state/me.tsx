import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '@/config';
import { fetchMe } from '@/api/me';
import { PortalError, toPortalError } from '@/api/portal';
import type { MeResponse } from '@/data/types';
import { useSession } from './session';
import { useStudio } from './studio';

export interface MeValue {
  /** Account, workspace and credits. Null while loading, when signed out, or after a failure. */
  me: MeResponse | null;
  loading: boolean;
  error: PortalError | null;
  /** Reads /portal/me again, e.g. after something changed the credits. Keeps the old value meanwhile. */
  reload: () => void;
}

const MeContext = createContext<MeValue | null>(null);

/** Real API: one GET /portal/me per sign-in (and per reload), dropped on sign-out. */
function ApiMeProvider({ children }: { children: ReactNode }) {
  const { signedIn } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PortalError | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!signedIn) {
      setMe(null);
      setError(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchMe().then(
      (next) => {
        if (!alive) return;
        setMe(next);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!alive) return;
        setMe(null);
        setError(toPortalError(err));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [signedIn, version]);

  const value = useMemo<MeValue>(() => ({ me, loading, error, reload }), [me, loading, error, reload]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

/** Mock API: the mock's own contract-shaped `me`, live with every change to its credits. */
function MockMeProvider({ children }: { children: ReactNode }) {
  const { me } = useStudio();
  const value = useMemo<MeValue>(() => ({ me, loading: false, error: null, reload: () => {} }), [me]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

/**
 * Who is signed in on the Studio side (GET /portal/me, FS-86): workspace name, site and the credit
 * meter the top bar shows. Picked once at build time from VITE_USE_MOCK_API.
 */
export const MeProvider = config.useMockApi ? MockMeProvider : ApiMeProvider;

export function useMe(): MeValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used inside <MeProvider>');
  return ctx;
}
