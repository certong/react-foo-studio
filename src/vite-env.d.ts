/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Studio API base URL, absolute, no trailing slash. Routes are /portal/... (no /api prefix). */
  readonly VITE_API_BASE_URL?: string;
  /** nest-foo-auth host; the app calls ${VITE_AUTH_URL}/api/auth/... */
  readonly VITE_AUTH_URL?: string;
  /** "true" while screens run on the built-in mock API. */
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
