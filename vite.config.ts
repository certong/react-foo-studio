import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL as NodeURL } from 'node:url';

// The two backends are named in .env (see .env.example): VITE_API_BASE_URL (the
// Studio API) and VITE_AUTH_URL (nest-foo-auth). Both are public and ship in the
// bundle; vite hands them to the app itself. This file only checks them, so a
// build that calls the real API can never ship without a backend.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());

  // A build still on the mock API needs no hosts, so a clean checkout with no
  // .env builds fine. Turning the mock off is what makes them required.
  if (command === 'build' && env.VITE_USE_MOCK_API === 'false') {
    for (const key of ['VITE_API_BASE_URL', 'VITE_AUTH_URL'] as const) {
      if (!URL.canParse(env[key] ?? '')) {
        throw new Error(`No ${key}, but VITE_USE_MOCK_API is false. Set an absolute URL in .env (see .env.example).`);
      }
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new NodeURL('./src', import.meta.url)) },
    },
    css: {
      modules: { localsConvention: 'camelCaseOnly' },
    },
    // nest-foo-auth lists http://localhost:5182 as the studio portal origin (AUTH_PORTAL_ORIGINS).
    server: { port: 5182, strictPort: true },
  };
});
