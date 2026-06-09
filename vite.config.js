import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // When using `vercel dev`, both frontend and /api routes are served on the same port — no proxy needed.
  // For standalone Vite dev (against old Express backend): uncomment below.
  // server: { proxy: { '/api': 'http://localhost:3001' } }
});
