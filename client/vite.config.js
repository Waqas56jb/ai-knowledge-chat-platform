import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PORT is honoured so `npm start` works on hosts such as Railway.
// The dev server is pinned to 5187 because the API's CORS allow-list expects that origin.
const port = Number(process.env.PORT) || undefined;

export default defineConfig({
  plugins: [react()],
  server: { port: port || 5187, strictPort: true },
  preview: { port: port || 4173, host: true }
});
