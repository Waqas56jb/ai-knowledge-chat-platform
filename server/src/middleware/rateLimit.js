import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const handler = (_req, _res, next) => next(ApiError.tooMany());
const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler, skip: () => env.isTest && !process.env.TEST_RATE_LIMITS };

/** Whole API, per IP. */
export const globalLimiter = rateLimit({ ...base, windowMs: 60000, limit: 600 });
/** Login, password reset (per IP). */
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60000, limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS * 3 });
/** Invitation validation/acceptance (per IP) — brute-force protection. */
export const invitationLimiter = rateLimit({ ...base, windowMs: 15 * 60000, limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS * 2 });
/** AI generation, per authenticated user. */
export const chatLimiter = rateLimit({ ...base, windowMs: env.CHAT_RATE_LIMIT_WINDOW_MS, limit: env.CHAT_RATE_LIMIT_MAX_REQUESTS, keyGenerator: req => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`) });
/** Admin ingestion (uploads, YouTube), per user. */
export const ingestLimiter = rateLimit({ ...base, windowMs: 10 * 60000, limit: 60, keyGenerator: req => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`) });
