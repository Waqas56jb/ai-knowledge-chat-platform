/**
 * Environment configuration, validated once at startup. Secrets are never logged.
 * The server refuses to start when required configuration is missing or invalid.
 */
import 'dotenv/config';
import { z } from 'zod';

const bool = d => z.enum(['true', 'false', '1', '0']).default(d).transform(v => v === 'true' || v === '1');
const int = (d, min = 0, max = Number.MAX_SAFE_INTEGER) => z.coerce.number().int().min(min).max(max).default(d);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(4001, 1, 65535),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// connection string'),
  DB_POOL_MAX: int(8, 1, 50),
  DB_STATEMENT_TIMEOUT_MS: int(30000, 1000, 300000),

  OPENAI_API_KEY: z.string().min(20),
  OPENAI_CHAT_MODEL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(), // legacy name, used when OPENAI_CHAT_MODEL is not set
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_EMBEDDING_DIMENSIONS: int(1536, 256, 3072),
  OPENAI_TIMEOUT_MS: int(45000, 5000, 180000),
  OPENAI_MAX_RETRIES: int(2, 0, 5),
  OPENAI_MAX_OUTPUT_TOKENS: int(900, 100, 4000),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_URL: z.string().url().default('http://localhost:5180'),
  EXTRA_CORS_ORIGINS: z.string().default(''),

  STORAGE_BUCKET: z.string().regex(/^ai_knowledge_chat_[a-z0-9_]+$/).default('ai_knowledge_chat_documents'),
  MAX_UPLOAD_SIZE_MB: int(20, 1, 100),
  MAX_DOCUMENT_PAGES: int(500, 1, 5000),
  MAX_SOURCE_CHARACTERS: int(2000000, 1000, 20000000),
  MAX_CONTEXT_CHUNKS: int(8, 1, 20),
  MAX_HISTORY_MESSAGES: int(6, 0, 20),
  RETRIEVAL_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.3),
  CHANNEL_MAX_VIDEOS: int(50, 1, 500),

  CHAT_RATE_LIMIT_WINDOW_MS: int(60000, 1000),
  CHAT_RATE_LIMIT_MAX_REQUESTS: int(20, 1),
  AUTH_RATE_LIMIT_MAX_REQUESTS: int(10, 1),
  INVITATION_EXPIRY_HOURS: int(168, 1, 24 * 60),

  WORKER_ENABLED: bool('true'),
  WORKER_CONCURRENCY: int(2, 1, 8),
  WORKER_POLL_MS: int(2000, 250, 60000),
  JOB_STALE_MINUTES: int(15, 1, 600),

  TRUST_PROXY: bool('false'),

  // Outgoing email (invitations, password resets, notices). Gmail: smtp.gmail.com:465 + an App Password.
  MAIL_ENABLED: bool('false'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: int(465, 1, 65535),
  SMTP_SECURE: bool('true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM_NAME: z.string().max(80).default('NEXUS AI'),
  MAIL_FROM_EMAIL: z.string().email().optional(), // defaults to SMTP_USER
  MAIL_REPLY_TO: z.string().email().optional(),
  // never deliver to reserved test domains (RFC 2606) — used by the automated tests
  MAIL_SKIP_DOMAINS: z.string().default('example.test,example.com,example.org,example.net,test,invalid,localhost')
}).superRefine((v, ctx) => {
  if (v.MAIL_ENABLED && (!v.SMTP_USER || !v.SMTP_PASS)) ctx.addIssue({ code: 'custom', path: ['SMTP_USER'], message: 'SMTP_USER and SMTP_PASS are required when MAIL_ENABLED=true' });
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Only variable NAMES are printed, never values.
  throw new Error(`Invalid server configuration (server/.env):\n${issues}`);
}

const e = parsed.data;
export const env = Object.freeze({
  ...e,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  OPENAI_CHAT_MODEL: e.OPENAI_CHAT_MODEL || e.OPENAI_MODEL || 'gpt-4o-mini',
  corsOrigins: [e.CLIENT_URL, e.ADMIN_URL, ...e.EXTRA_CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)]
});

/** Names (not values) of configured secrets, for diagnostics. */
export const configuredSecrets = () => ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'DATABASE_URL', 'OPENAI_API_KEY', ...(e.MAIL_ENABLED ? ['SMTP_USER', 'SMTP_PASS'] : [])].map(k => ({ name: k, set: !!process.env[k] }));
