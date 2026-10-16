/**
 * Sign-in against nest-foo-auth (FS-70, FS-71, FS-87): email + 6-digit PIN, with an optional remembered
 * device. Studio is the `studio` portal there: the browser's Origin (http://localhost:5182 locally) must
 * be in its AUTH_PORTAL_ORIGINS. Contract: nest-foo-auth docs/handoff/2026-10-15-studio-email-pin.md
 * (per-account PIN + FA-23).
 *
 * - POST /api/auth/pin-login { email, pin, rememberDevice } → { accessToken, user } + httpOnly cp_refresh
 *   (12 h), and cp_device (30 days) when rememberDevice is true
 * - GET  /api/auth/device (cp_device) → { email, displayName, rememberedUntil }, or 404
 * - POST /api/auth/device-unlock { pin } (cp_device) → same as pin-login; 404 when the device is gone
 * - POST /api/auth/device/forget → 204 ("Not you?")
 * - POST /api/auth/refresh (cookie) → { accessToken }
 * - POST /api/auth/logout → clears cp_refresh only, so the device stays remembered
 * - GET  /api/me (Bearer) → the signed-in account
 * Errors: 401 { attemptsRemaining }, 429 { retryAfter }, 403 wrong portal, 404 device gone.
 *
 * The access token lives in memory only (never storage) and goes to the Studio API as a Bearer header.
 *
 * VITE_USE_MOCK_AUTH=true swaps all of this for a built-in demo account (DEMO_EMAIL / DEMO_PIN) that
 * follows the same contract, remembered device and lockout included.
 */
import { config } from '@/config';
import { session as demo } from '@/data/seed';
import { getAccessToken, setAccessToken } from './client';

export const DEMO_EMAIL = demo.email;
export const DEMO_PIN = '123456';
export const PIN_LENGTH = 6;

export interface AuthUser {
  id: string;
  email?: string;
  accountType?: 'staff' | 'client';
  /** Billing client id; only on client accounts. */
  clientId?: number;
}

/** A remembered device, for Welcome back. */
export interface RememberedDevice {
  email: string;
  displayName: string | null;
  /** ISO date-time the device stops being remembered. */
  rememberedUntil: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'locked'
  | 'wrong_portal'
  | 'device_gone'
  | 'invalid_input'
  | 'unreachable'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    /** Wrong PIN: tries left before the account locks. */
    public attemptsRemaining?: number,
    /** Locked: seconds until the next try is allowed. */
    public retryAfter?: number,
  ) {
    super(code);
  }
}

function waitText(seconds = 60) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? 'a minute' : `${minutes} minutes`;
}

/**
 * Words for a failed sign-in. `knownEmail` is true on Welcome back, where only the PIN can be wrong;
 * on Sign in the server can't say whether the email or the PIN was wrong.
 */
export function authErrorMessage(e: unknown, { knownEmail = false } = {}): string {
  const err = e instanceof AuthError ? e : new AuthError('unknown');
  switch (err.code) {
    case 'invalid_credentials': {
      const what = knownEmail ? "That PIN didn't match." : "That email and PIN don't match.";
      const n = err.attemptsRemaining;
      return n === undefined ? what : `${what} ${n} ${n === 1 ? 'try' : 'tries'} left.`;
    }
    case 'locked':
      return `Too many tries. Try again in ${waitText(err.retryAfter)}, or ask Chi to reset your PIN.`;
    case 'wrong_portal':
      return "This account can't sign in to Studio. Ask Chi to set up Studio access.";
    case 'device_gone':
      return 'This device is no longer remembered. Sign in with your email and PIN.';
    case 'invalid_input':
      return 'Check the email and PIN, then try again.';
    case 'unreachable':
      return "We can't reach sign-in right now. Check your connection and try again.";
    default:
      return 'Something went wrong on our side. Try again, or ask Chi.';
  }
}

const useMock = config.useMockAuth;
const AUTH_API = `${config.authUrl ?? ''}/api`;
const MOCK_KEY = 'studio.session';
const MOCK_DEVICE_KEY = 'studio.device';
const MOCK_ATTEMPTS = 5;
/** Refresh this long before the access token expires (tokens last 15 minutes). */
const REFRESH_EARLY_MS = 60_000;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let onExpired: (() => void) | null = null;

/** Called when the session can no longer be renewed (cookie expired, account disabled…). */
export function onSessionExpired(handler: (() => void) | null) {
  onExpired = handler;
}

async function errorFor(res: Response, path: string): Promise<AuthError> {
  const body = (await res.json().catch(() => null)) as { attemptsRemaining?: number; retryAfter?: number } | null;
  if (res.status === 401) {
    const left = body?.attemptsRemaining;
    return left === 0 ? new AuthError('locked', 0) : new AuthError('invalid_credentials', left);
  }
  if (res.status === 429) return new AuthError('locked', 0, body?.retryAfter ?? (Number(res.headers.get('Retry-After')) || undefined));
  if (res.status === 403) return new AuthError('wrong_portal');
  // 404 means "device gone" only on the device routes; anywhere else the route itself is missing.
  if (res.status === 404) return new AuthError(path.startsWith('/auth/device') ? 'device_gone' : 'unknown');
  if (res.status === 400) return new AuthError('invalid_input');
  return new AuthError('unknown');
}

async function call<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown; token?: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_API}${path}`, {
      method: init.method,
      credentials: 'include',
      headers: {
        // nest-foo-auth refuses any POST without it, bodyless ones included.
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new AuthError('unreachable');
  }
  if (!res.ok) throw await errorFor(res, path);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Seconds-since-epoch `exp` from a JWT, without verifying it (the server does that). */
function expiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function adoptToken(token: string) {
  setAccessToken(token);
  clearTimeout(refreshTimer);
  const exp = expiresAt(token);
  if (exp) {
    refreshTimer = setTimeout(() => {
      refresh().then((ok) => {
        if (!ok) onExpired?.();
      });
    }, Math.max(5_000, exp - Date.now() - REFRESH_EARLY_MS));
  }
}

function clearToken() {
  clearTimeout(refreshTimer);
  setAccessToken(null);
}

let refreshing: Promise<boolean> | null = null;

/**
 * Swaps the refresh cookie for a new access token. False when there's no valid session.
 * Concurrent callers share one request (React runs effects twice in development).
 */
function refresh(): Promise<boolean> {
  refreshing ??= call<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
    .then(({ accessToken }) => {
      adoptToken(accessToken);
      return true;
    })
    .catch(() => {
      clearToken();
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * For the Studio API's 401 TOKEN_EXPIRED: a new access token from the refresh cookie, then the call
 * can be retried. False (and the session ends) when the cookie no longer works. The mock has no
 * token to refresh.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (useMock) return false;
  const ok = await refresh();
  if (!ok) onExpired?.();
  return ok;
}

/** Sign in: email + PIN. `rememberDevice` makes the next visit Welcome back (PIN only) for 30 days. */
export async function pinLogin(email: string, pin: string, rememberDevice: boolean): Promise<AuthUser> {
  if (useMock) {
    await mockDelay();
    mockCheck(email.trim().toLowerCase() === DEMO_EMAIL && pin === DEMO_PIN);
    if (rememberDevice) {
      mockWrite(MOCK_DEVICE_KEY, { email: DEMO_EMAIL, displayName: demo.fullName, rememberedUntil: daysFromNow(30) });
    }
    return mockSignIn();
  }
  const { accessToken, user } = await call<{ accessToken: string; user: AuthUser }>('/auth/pin-login', {
    method: 'POST',
    body: { email: email.trim(), pin, rememberDevice },
  });
  adoptToken(accessToken);
  return user;
}

/** The remembered device, or null when this browser has none (or it expired or was revoked). */
export async function rememberedDevice(): Promise<RememberedDevice | null> {
  if (useMock) {
    const d = mockRead<RememberedDevice>(MOCK_DEVICE_KEY);
    return d && Date.parse(d.rememberedUntil) > Date.now() ? d : null;
  }
  try {
    return await call<RememberedDevice>('/auth/device', { method: 'GET' });
  } catch {
    return null;
  }
}

/** Welcome back: the PIN alone, on a remembered device. */
export async function deviceUnlock(pin: string): Promise<AuthUser> {
  if (useMock) {
    await mockDelay();
    if (!(await rememberedDevice())) throw new AuthError('device_gone');
    mockCheck(pin === DEMO_PIN);
    return mockSignIn();
  }
  const { accessToken, user } = await call<{ accessToken: string; user: AuthUser }>('/auth/device-unlock', {
    method: 'POST',
    body: { pin },
  });
  adoptToken(accessToken);
  return user;
}

/** "Not you?": stop remembering this device. Never fails; the next screen is Sign in either way. */
export async function forgetDevice(): Promise<void> {
  if (useMock) {
    mockRemove(MOCK_DEVICE_KEY);
    return;
  }
  await call('/auth/device/forget', { method: 'POST' }).catch(() => {});
}

let restoring: Promise<AuthUser | null> | null = null;

/** On load: resume the session from the refresh cookie, if there is one. One check per page load. */
export function restore(): Promise<AuthUser | null> {
  restoring ??= resume();
  return restoring;
}

async function resume(): Promise<AuthUser | null> {
  if (useMock) return mockRead<{ user?: AuthUser }>(MOCK_KEY)?.user ?? null;
  if (!(await refresh())) return null;
  try {
    return await call<AuthUser>('/me', { method: 'GET', token: getAccessToken() ?? undefined });
  } catch {
    clearToken();
    return null;
  }
}

/** Ends the session. The remembered device stays, so the next visit shows Welcome back. */
export async function logout(): Promise<void> {
  restoring = null;
  if (useMock) {
    mockRemove(MOCK_KEY);
    return;
  }
  try {
    await call('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

// --- mock (VITE_USE_MOCK_AUTH) ------------------------------------------------------------------

let mockAttempts = MOCK_ATTEMPTS;
let mockLockedUntil = 0;

const mockDelay = () => new Promise((r) => setTimeout(r, 500));
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

/** Same countdown and lock as the real service: 5 tries, then a minute's wait. */
function mockCheck(ok: boolean) {
  const wait = Math.ceil((mockLockedUntil - Date.now()) / 1000);
  if (wait > 0) throw new AuthError('locked', 0, wait);
  if (ok) {
    mockAttempts = MOCK_ATTEMPTS;
    return;
  }
  mockAttempts -= 1;
  if (mockAttempts <= 0) {
    mockAttempts = MOCK_ATTEMPTS;
    mockLockedUntil = Date.now() + 60_000;
    throw new AuthError('locked', 0, 60);
  }
  throw new AuthError('invalid_credentials', mockAttempts);
}

function mockSignIn(): AuthUser {
  const user: AuthUser = { id: 'demo', email: DEMO_EMAIL, accountType: 'client' };
  mockWrite(MOCK_KEY, { user });
  return user;
}

function mockRead<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function mockWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: lasts for this tab only */
  }
}

function mockRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing stored */
  }
}
