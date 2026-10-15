import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login, logout, onSessionExpired, restore, type AuthUser } from '@/api/auth';

type Status = 'checking' | 'signed-in' | 'signed-out';

interface SessionValue {
  status: Status;
  signedIn: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Who is signed in (FS-87). On load it resumes from nest-foo-auth's refresh cookie; until that
 * answers, status is 'checking' so guarded pages don't bounce to Sign in on every reload.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let alive = true;
    restore().then((u) => {
      if (!alive) return;
      setUser(u);
      setStatus(u ? 'signed-in' : 'signed-out');
    });
    onSessionExpired(() => {
      setUser(null);
      setStatus('signed-out');
    });
    return () => {
      alive = false;
      onSessionExpired(null);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await login(email, password);
    setUser(u);
    setStatus('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setStatus('signed-out');
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status, signedIn: status === 'signed-in', user, signIn, signOut }),
    [status, user, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
