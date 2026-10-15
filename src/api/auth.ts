/**
 * Sign-in against nest-foo-auth (FS-87). Studio is the `studio` portal there: the browser's Origin
 * (http://localhost:5182 locally) must be in its AUTH_PORTAL_ORIGINS.
 *
 * - POST /api/auth/login { email, password } → { accessToken, user } and an httpOnly cp_refresh cookie
 * - POST /api/auth/refresh (cookie) → { accessToken }; the cookie lasts 12 hours
 * - POST /api/auth/logout → clears the cookie
 * - GET  /api/me (Bearer) → the signed-in account
 *
 * The access token lives in memory only (never storage) and goes to the Studio API as a Bearer header.
 * Email + PIN and "remember this device" need FA-23 in nest-foo-auth; until then it's email + password.
 *
 * VITE_USE_MOCK_AUTH=true swaps all of this for a built-in demo account (DEMO_EMAIL / DEMO_PASSWORD).
 */
import { config } from '@/config';
import { session as demo } from '@/data/seed';
import { getAccessToken, setAccessToken } from './client';

export const DEMO_EMAIL = demo.email;
export const DEMO_PASSWORD = 'kopilane';

export interface AuthUser {
  id: string;
  email?: string;
  accountType?: 'staff' | 'client';
  /** Billing client id; only on client accounts. */
  clientId?: number;
}

export type AuthErrorCode = 'invalid_credentials' | 'wrong_portal' | 'rate_limited' | 'invalid_input' | 'unreachable' | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
  }
}

export function authErrorMessage(e: unknown): string {
  const code = e instanceof AuthError ? e.code : 'unknown';
  switch (code) {
    case 'invalid_credentials':
      return "That email and password don't match. Check them, or ask Chi to reset your password.";
    case 'wrong_portal':
      return "This account can't sign in to Studio. Ask Chi to set up Studio access.";
    case 'rate_limited':
      return 'Too many tries. Wait 15 minutes, or ask Chi.';
    case 'invalid_input':
      return 'Check the email and password, then try again.';
    case 'unreachable':
      return "We can't reach sign-in right now. Check your connection and try again.";
    default:
      return 'Something went wrong on our side. Try again, or ask Chi.';
  }
}

const useMock = config.useMockAuth;
const AUTH_API = `${config.authUrl ?? ''}/api`;
const MOCK_KEY = 'studio.session';
/** Refresh this long before the access token expires (tokens last 15 minutes). */
const REFRESH_EARLY_MS = 60_000;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let onExpired: (() => void) | null = null;

/** Called when the session can no longer be renewed (cookie expired, account disabled…). */
export function onSessionExpired(handler: (() => void) | null) {
  onExpired = handler;
}

function errorFor(status: number): AuthError {
  if (status === 401) return new AuthError('invalid_credentials');
  if (status === 403) return new AuthError('wrong_portal');
  if (status === 429) return new AuthError('rate_limited');
  if (status === 400) return new AuthError('invalid_input');
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
  if (!res.ok) throw errorFor(res.status);
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

export async function login(email: string, password: string): Promise<AuthUser> {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 500));
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) throw new AuthError('invalid_credentials');
    const user: AuthUser = { id: 'demo', email: DEMO_EMAIL, accountType: 'client' };
    try {
      localStorage.setItem(MOCK_KEY, JSON.stringify({ user }));
    } catch {
      /* storage unavailable: signed in for this tab only */
    }
    return user;
  }
  const { accessToken, user } = await call<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
  adoptToken(accessToken);
  return user;
}

let restoring: Promise<AuthUser | null> | null = null;

/** On load: resume the session from the refresh cookie, if there is one. One check per page load. */
export function restore(): Promise<AuthUser | null> {
  restoring ??= resume();
  return restoring;
}

async function resume(): Promise<AuthUser | null> {
  if (useMock) {
    try {
      return (JSON.parse(localStorage.getItem(MOCK_KEY) ?? 'null') as { user?: AuthUser } | null)?.user ?? null;
    } catch {
      return null;
    }
  }
  if (!(await refresh())) return null;
  try {
    return await call<AuthUser>('/me', { method: 'GET', token: getAccessToken() ?? undefined });
  } catch {
    clearToken();
    return null;
  }
}

export async function logout(): Promise<void> {
  restoring = null;
  if (useMock) {
    try {
      localStorage.removeItem(MOCK_KEY);
    } catch {
      /* nothing stored */
    }
    return;
  }
  try {
    await call('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}
