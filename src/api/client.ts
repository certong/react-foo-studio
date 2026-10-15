/**
 * Typed client for the Studio API (nest-foo-studio), generated from its openapi.json (FS-85).
 *
 * Screens still read the in-memory mock (src/api/studio.ts) while VITE_USE_MOCK_API=true; each
 * screen switches to this client when its backend ticket lands. Regenerate the types with
 * `npm run api:types` — never edit src/api/schema.d.ts by hand.
 */
import createClient, { type Middleware } from 'openapi-fetch';
import { config } from '@/config';
import type { components, paths } from './schema';

type Schemas = components['schemas'];

/** Every API error is this envelope: one `Error_<CODE>` schema per code. */
export type ApiError = Schemas[Extract<keyof Schemas, `Error_${string}`>];
export type ApiErrorCode = ApiError['code'];

let accessToken: string | null = null;

/** The access token from Foo-Auth (FS-87). Held in memory only; sent as a Bearer header. */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * A fresh key for one user action on a money or publish route. Reuse the same key when retrying
 * that action, so the server can tell a retry from a second click.
 *
 * Six routes require it, and their generated types make the header mandatory:
 * POST /portal/requests/{id}/drop, /approve, /previews, /sign-off, /uat/approve and POST /portal/topups.
 */
export function idempotencyKey(): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': crypto.randomUUID() };
}

const auth: Middleware = {
  onRequest({ request }) {
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
    return request;
  },
};

export const api = createClient<paths>({ baseUrl: config.apiBaseUrl ?? '' });
api.use(auth);

/** True for the `{ code, message, details? }` envelope the API returns on every error. */
export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}
