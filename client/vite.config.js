import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // The app is served at /app (by Express in production, by Vite at http://localhost:5173/app/ in development)
  base: '/app/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Development proxy: /api calls go to the Express server, so the browser sees one origin
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
