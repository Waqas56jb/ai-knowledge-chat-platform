import { env } from './env.js';

/** Strict allowlist: only the configured client and admin origins (plus explicit extras). */
export const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // same-origin, curl, server-to-server
    return cb(null, env.corsOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
  credentials: false,
  maxAge: 600
};
