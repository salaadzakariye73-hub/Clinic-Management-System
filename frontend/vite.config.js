import { defineConfig } from 'vite';

// JSX lives in .jsx files; esbuild uses the automatic runtime (no "import React" needed).
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    port: 5173,
    // In development "/api" is forwarded to the Express server (no CORS needed)
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
