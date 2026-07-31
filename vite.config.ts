import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
// defineConfig comes from vitest/config (a superset of vite's) so the `test` block
// below type-checks without splitting into a second config file — the dev server,
// build and tests then share one set of aliases. loadEnv must still come from vite:
// vitest/config re-exports defineConfig but not loadEnv.
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Vercel serves the app from the domain root, and /api/generate-pdf has to resolve as
    // a sibling of it. The GitHub Pages workflow that would have needed a project-page
    // subpath here was removed — Pages could not run the api/ functions anyway.
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
    test: {
      // The engine under test is pure arithmetic — no DOM, so no jsdom dependency.
      environment: 'node',
      // api/ is included as well as src/: the serverless handlers are tested against the
      // same engine, and a src-only glob silently skips them rather than failing.
      include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    }
  };
});
