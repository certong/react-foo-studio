import { session } from '@/data/seed';

/** Mock auth until the API exists. The demo PIN for mei@kopilane.com is 123456. */
export const DEMO_PIN = '123456';
export const PIN_LENGTH = 6;
export const MAX_TRIES_PER_MINUTE = 5;
const WINDOW_MS = 60_000;
const LATENCY_MS = 600;

export type AuthErrorCode = 'unknown_email' | 'bad_pin' | 'locked';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    public triesLeft = 0,
  ) {
    super(code);
  }
}

let failures: number[] = [];

function recentFailures(now: number) {
  failures = failures.filter((t) => now - t < WINDOW_MS);
  return failures.length;
}

export interface AuthUser {
  name: string;
  fullName: string;
  initials: string;
  email: string;
}

export async function verifyPin(email: string, pin: string): Promise<AuthUser> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const now = Date.now();
  if (recentFailures(now) >= MAX_TRIES_PER_MINUTE) throw new AuthError('locked');
  if (email.trim().toLowerCase() !== session.email) throw new AuthError('unknown_email');
  if (pin !== DEMO_PIN) {
    failures.push(now);
    const left = MAX_TRIES_PER_MINUTE - failures.length;
    throw left > 0 ? new AuthError('bad_pin', left) : new AuthError('locked');
  }
  failures = [];
  return { name: session.name, fullName: session.fullName, initials: session.initials, email: session.email };
}

export function authErrorMessage(e: unknown): string {
  if (!(e instanceof AuthError)) return "Something went wrong on our side. Try again, or ask Chi.";
  switch (e.code) {
    case 'unknown_email':
      return "We don't have that email. Use the one Chi set up for you.";
    case 'bad_pin':
      return `That PIN didn't match. ${e.triesLeft} ${e.triesLeft === 1 ? 'try' : 'tries'} left this minute.`;
    case 'locked':
      return 'Too many tries. Wait a minute, or ask Chi to reset your PIN.';
  }
}
