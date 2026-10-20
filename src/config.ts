/**
 * Runtime config from the active env file (.env.development, .env.uat, .env.production, or a
 * .env.<mode>.local override). See .env.example. Everything here is public: it ships in the
 * browser bundle.
 */

function baseUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || !URL.canParse(value)) return null;
  return value.replace(/\/+$/, '');
}

export const config = {
  /** Studio API (nest-foo-studio), e.g. `${apiBaseUrl}/portal/me`. Null until the mode's host is set. */
  apiBaseUrl: baseUrl(import.meta.env.VITE_API_BASE_URL),
  /** nest-foo-auth host, e.g. `${authUrl}/api/auth/pin-login`. */
  authUrl: baseUrl(import.meta.env.VITE_AUTH_URL),
  /** Screens use the built-in mock API (src/api/studio.ts, src/api/auth.ts) until this is false. */
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  /** Sign in with the built-in demo account instead of nest-foo-auth (offline work and tests). */
  useMockAuth: import.meta.env.VITE_USE_MOCK_AUTH === 'true',
} as const;
