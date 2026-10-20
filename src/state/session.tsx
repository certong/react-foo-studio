import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  deviceUnlock,
  forgetDevice as forgetRemoteDevice,
  logout,
  onSessionExpired,
  pinLogin,
  rememberedDevice,
  restore,
  type AuthUser,
  type RememberedDevice,
} from '@/api/auth';

type Status = 'checking' | 'signed-in' | 'signed-out';

interface SessionValue {
  status: Status;
  signedIn: boolean;
  user: AuthUser | null;
  /** This browser's remembered device, for Welcome back. Null when there is none. */
  remembered: RememberedDevice | null;
  signIn: (email: string, pin: string, rememberDevice: boolean) => Promise<void>;
  /** Welcome back: PIN only, on the remembered device. */
  unlock: (pin: string) => Promise<void>;
  /** "Not you?" */
  forgetDevice: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Who is signed in (FS-87), and whether this device is remembered (FS-71). On load it resumes from
 * nest-foo-auth's refresh cookie and asks for the device cookie; until both answer, status is
 * 'checking' so guarded pages don't bounce to Sign in on every reload.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [remembered, setRemembered] = useState<RememberedDevice | null>(null);
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let alive = true;
    Promise.all([restore(), rememberedDevice()]).then(([u, device]) => {
      if (!alive) return;
      setUser(u);
      setRemembered(device);
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

  const signIn = useCallback(async (email: string, pin: string, rememberDevice: boolean) => {
    const u = await pinLogin(email, pin, rememberDevice);
    // Unticked keeps whatever device was remembered before; ticked replaces it.
    if (rememberDevice) setRemembered(await rememberedDevice());
    setUser(u);
    setStatus('signed-in');
  }, []);

  const unlock = useCallback(async (pin: string) => {
    try {
      setUser(await deviceUnlock(pin));
      setStatus('signed-in');
    } catch (err) {
      // The device was revoked or expired meanwhile: Welcome back no longer applies.
      if ((err as { code?: string }).code === 'device_gone') setRemembered(null);
      throw err;
    }
  }, []);

  const forgetDevice = useCallback(async () => {
    setRemembered(null);
    await forgetRemoteDevice();
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
    () => ({ status, signedIn: status === 'signed-in', user, remembered, signIn, unlock, forgetDevice, signOut }),
    [status, user, remembered, signIn, unlock, forgetDevice, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
