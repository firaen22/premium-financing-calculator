import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
// defineConfig comes from vitest/config (a superset of vite's) so the `test` block
// below type-checks without splitting into a second config file — the dev server,
// build and tests then share one set of aliases.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// No `define` block: secrets must never be inlined into the client bundle. The chat
// assistant's key is read server-side in api/chat.ts instead.
export default defineConfig(() => {
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
      // tests/ is included as well as src/: API tests live outside api/ so Vercel does not
      // deploy them as public serverless endpoints, and a src-only glob skips them.
      include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    }
  };
});
