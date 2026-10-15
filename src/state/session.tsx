import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { verifyPin, type AuthUser } from '@/api/auth';
import { addDays, today } from '@/lib/date';

const REMEMBER_DAYS = 30;
const STORAGE_KEY = 'studio.session';

export interface RememberedDevice {
  user: AuthUser;
  /** ISO date the device stops being remembered. */
  until: string;
}

interface Stored {
  remembered: RememberedDevice | null;
  user: AuthUser | null;
}

interface SessionValue extends Stored {
  signedIn: boolean;
  signIn: (email: string, pin: string, remember: boolean) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  signOut: () => void;
  forgetDevice: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { remembered: null, user: null };
    const parsed = JSON.parse(raw) as Stored;
    const expired = parsed.remembered && new Date(parsed.remembered.until) < today();
    return { remembered: expired ? null : parsed.remembered, user: parsed.user };
  } catch {
    return { remembered: null, user: null };
  }
}

function save(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: session lasts for this tab only */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(load);

  const update = useCallback((next: Stored) => {
    save(next);
    setState(next);
  }, []);

  const signIn = useCallback(
    async (email: string, pin: string, remember: boolean) => {
      const user = await verifyPin(email, pin);
      const remembered = remember ? { user, until: addDays(today(), REMEMBER_DAYS).toISOString() } : null;
      update({ user, remembered });
    },
    [update],
  );

  const unlock = useCallback(
    async (pin: string) => {
      if (!state.remembered) throw new Error('No remembered device');
      const user = await verifyPin(state.remembered.user.email, pin);
      update({ ...state, user });
    },
    [state, update],
  );

  const signOut = useCallback(() => update({ ...state, user: null }), [state, update]);
  const forgetDevice = useCallback(() => update({ user: null, remembered: null }), [update]);

  const value = useMemo<SessionValue>(
    () => ({ ...state, signedIn: state.user != null, signIn, unlock, signOut, forgetDevice }),
    [state, signIn, unlock, signOut, forgetDevice],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
