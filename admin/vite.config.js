import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The API's CORS allow-list contains http://localhost:5188 for the admin console, so the dev server
// must run on exactly that port (strictPort fails fast instead of silently picking another one).
// PORT is still honoured so `npm run preview` works on hosts such as Railway.
const port = Number(process.env.PORT) || undefined;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: port || 5188, strictPort: true },
  preview: { port: port || 4180, host: true },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion']
        }
      }
    }
  }
});
