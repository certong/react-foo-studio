import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL as NodeURL } from 'node:url';

// Each mode's two backends are named in its own env file (see .env.example):
// VITE_API_BASE_URL (the Studio API) and VITE_AUTH_URL (nest-foo-auth).
// Both are public and ship in the bundle; vite hands them to the app itself.
// This file only checks them, so a build can never ship without a backend.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());

  if (command === 'build') {
    for (const key of ['VITE_API_BASE_URL', 'VITE_AUTH_URL'] as const) {
      if (!URL.canParse(env[key] ?? '')) {
        throw new Error(`No ${key} for mode "${mode}". Set an absolute URL in .env.${mode} (see .env.example).`);
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
