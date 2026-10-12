# NEXUS AI — API server

Node.js (Express, ES modules) backend for the NEXUS AI knowledge chat platform. It uses:

- **Supabase**: Postgres with pgvector, Auth, and Storage.
- **OpenAI**: answers and embeddings.

It serves two frontends:

| App | Folder | Dev URL |
|---|---|---|
| User app | `../client` | http://localhost:5187 |
| Admin panel | `../admin` | http://localhost:5188 |

The API itself runs at `http://localhost:4001/api/v1`. The full endpoint contract is in [docs/API.md](docs/API.md).

## Architecture

```
src/
  server.js            boot: env check → migration check → HTTP server → job worker → graceful shutdown
  app.js               express app: helmet, CORS allowlist, request ids, rate limits, routes, error handler
  config/              env (zod-validated), constants (table names), database (pg pool), supabase, openai, cors
  middleware/          authenticate (Supabase JWT → profile), authorize (roles), validate (zod), rateLimit, upload
  routes/ controllers/ HTTP layer only
  services/            business logic: auth, users, invitations, sources, ingestion, youtube, transcript,
                       document, chunking, embedding, retrieval, reranking (RRF), scope policy, chat (RAG),
                       conversations, analytics, audit, notifications, settings, search
  jobs/                Postgres-backed job queue worker (SKIP LOCKED), processSource pipeline, cleanup
supabase/migrations/   SQL migrations (prefixed, additive only)
scripts/               migrate, inspect-db, verify-config, bootstrap-admin, reindex-sources
tests/                 unit, integration, security (vitest + supertest), live/ end-to-end scripts
```

**Request flow:** the client sends `Authorization: Bearer <Supabase access token>`, which is verified with Supabase Auth. The matching profile row (role, status) is then loaded, and suspended or revoked accounts are rejected. Every response uses the envelope `{ success, data, meta }` or `{ success: false, error: { code, message, requestId } }`.

**Answer flow (RAG):**
1. A scope and policy check refuses prompt injection, requests for secrets, blocked topics, and out-of-domain questions before any model call.
2. The question is embedded.
3. Hybrid retrieval combines pgvector cosine search and Postgres full-text search, merged with reciprocal-rank fusion.
4. Retrieval is limited to sources the user may access (`ai_knowledge_chat_accessible_source_ids`).
5. An evidence-sufficiency threshold is applied.
6. `gpt-4o-mini` answers only from the fenced evidence, as JSON.
7. Citations are validated and renumbered. Unsupported answers are replaced by the fallback message.
8. The outcome is stored as `answered`, `insufficient_evidence`, `out_of_scope` or `error`.

**Ingestion flow:** admin adds a source → a job is queued → the worker extracts text (YouTube captions, PDF, DOCX, TXT/MD or pasted text) → normalises and chunks it → embeds it (`text-embedding-3-small`, 1536 dimensions) → indexes it. Jobs record progress, step, logs and attempts. Transient failures retry with backoff, and stale jobs are recovered.

## Shared-database safety

The Supabase project also hosts other projects' tables, so this server only ever touches its own objects:

- Every table, index, function, trigger and policy is prefixed with **`ai_knowledge_chat_`**, and the storage bucket is `ai_knowledge_chat_documents`.
- `npm run db:migrate` runs each migration inside a transaction. It rejects any statement that is not an additive operation on a prefixed object. It also fingerprints every non-prefixed object in the database before and after, and **rolls back if anything outside the prefix changed**.
- Applied migrations are recorded in `ai_knowledge_chat_schema_migrations`. No migration drops, truncates or resets anything.
- The only shared change is `create extension if not exists vector with schema extensions` (pgvector).
- RLS is enabled on all app tables, and privileges are revoked from `anon` and `authenticated`. The browser never talks to these tables directly; only this server does, and it enforces access control in SQL.

## Requirements

- Node.js 20 or newer (tested on Node 24).
- A Supabase project, with its URL, anon key, service-role key and the pooler connection string.
- An OpenAI API key.

## Setup

```bash
cd server
npm install
cp .env.example .env          # fill in the values — never commit .env
npm run verify-config         # checks env, database, Supabase Auth, Storage, OpenAI (no secrets printed)
npm run db:migrate -- --dry   # show pending migrations without applying
npm run db:migrate            # apply migrations (guarded, transactional)
npm run db:status             # list applied migrations
npm run bootstrap-admin -- --email admin@example.com --name "Admin" --generate
npm run dev                   # http://localhost:4001/api/v1 (auto-restart) — or: npm start
```

### Environment variables

See [.env.example](.env.example) for the full list with comments. The main ones:

| Variable | Purpose |
|---|---|
| `PORT`, `API_PREFIX` | HTTP port (4001) and route prefix (`/api/v1`) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project. **Server only.** |
| `DATABASE_URL` | Postgres pooler connection string (URL-encode the password) |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL` | OpenAI. **Server only.** The embedding model must output 1536 dimensions. |
| `CLIENT_URL`, `ADMIN_URL`, `EXTRA_CORS_ORIGINS` | CORS allowlist; invitation links are built from `CLIENT_URL` |
| `STORAGE_BUCKET`, `MAX_UPLOAD_SIZE_MB`, `MAX_DOCUMENT_PAGES`, `MAX_SOURCE_CHARACTERS` | Upload and size limits |
| `MAX_CONTEXT_CHUNKS`, `RETRIEVAL_MIN_SIMILARITY`, `MAX_HISTORY_MESSAGES` | Retrieval tuning (the admin Knowledge settings override some of these at runtime) |
| `CHAT_RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX_REQUESTS` | Per-user and per-IP rate limits |
| `WORKER_ENABLED`, `WORKER_CONCURRENCY`, `WORKER_POLL_MS`, `JOB_STALE_MINUTES` | Background worker |
| `TRUST_PROXY` | Set to `true` behind Railway, Render or Nginx |

The frontends only receive `VITE_API_BASE_URL`. The service-role key and the OpenAI key must never be placed in `client/` or `admin/`.

### First admin

There are no hardcoded credentials and no public endpoint for creating admins. Use the CLI instead:

```bash
npm run bootstrap-admin -- --email you@company.com --name "Your Name" --generate
```

With `--generate`, a strong random password is written to `server/.bootstrap-admin-password`. That file is git-ignored and its contents are never printed. Sign in, change the password, then delete the file. The script refuses to run if an admin already exists, unless you pass `--allow-additional`. It also refuses to reuse an existing auth account, unless you pass `--use-existing-auth-user`.

Everyone else joins by invitation: in the admin panel go to **Invitations → New**, and the server emails the one-time link `CLIENT_URL/register?invite=<token>` to the invitee. The link is also shown to the admin once, as a backup if the email doesn't arrive. Only a hash of each token is stored, and resending an invitation rotates the token and emails the new link.

### Supabase Auth settings

- **Password reset:** `POST /auth/forgot-password` makes a one-time Supabase recovery token on the server and emails our own link, `CLIENT_URL/reset-password?token_hash=…`. The client's reset page posts it to `POST /auth/reset-password`, and the server verifies it with Supabase (`verifyOtp`). No Supabase redirect configuration is needed. If outgoing email is disabled, Supabase's own recovery email is used instead; that link needs `CLIENT_URL/reset-password` in **Authentication → URL Configuration → Redirect URLs**.
- Accounts created by invitation are confirmed immediately, because the invitation proves the email address.
- Suspending or revoking a user also bans them in Supabase Auth, so their existing tokens stop working.

### Email

The server sends invitations, password resets and a welcome email through SMTP (nodemailer). The templates are branded HTML with a plain-text version, in `src/services/mail.service.js`.

- Configure it in `server/.env`: `MAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_NAME`. Optionally also `MAIL_FROM_EMAIL` and `MAIL_REPLY_TO`.
- For Gmail, use `smtp.gmail.com:465` and an **App Password** (Google Account → Security → 2-Step Verification → App passwords), not the normal account password.
- To check the setup, run `npm run verify-config` (SMTP login) and `npm run mail:test -- --to you@domain --type notice|invitation|reset|welcome`.
- A mail failure never breaks a user flow. If an invitation email fails, the admin is told and still gets the link.
- Recipients on reserved test domains (`MAIL_SKIP_DOMAINS`, e.g. `example.test`) are never emailed, and the automated tests run with mail disabled.

### Storage

Uploaded documents go to the **private** bucket `ai_knowledge_chat_documents`, which is created automatically if it is missing. Downloads use short-lived signed URLs, issued only to users who can access the source.

## YouTube transcripts

- **Video metadata:** read through YouTube oEmbed.
- **Transcripts:** fetched from the video's public caption tracks (the same data YouTube's own transcript panel uses). Manual captions are preferred over auto-generated ones, and the transcript keeps per-segment timestamps, so citations link to `&t=<seconds>`.
- **Channel URLs:** expand to the newest `maxVideos` uploads (set per channel when adding it, default `CHANNEL_MAX_VIDEOS` = 50, max 500). The list comes from the channel's RSS feed for 15 or fewer videos, otherwise from the public Videos tab, which is also the fallback when YouTube serves no feed for the channel. Re-processing a channel source adds any new uploads and skips videos already indexed.
- **Fallback:** if a video has no captions, or YouTube blocks the request, the job fails with a clear message. An admin can then add the video again with a **pasted transcript**. Formats such as `0:00 text` and `[01:02:03] text` keep their timestamps.

When a lot of videos are fetched in a short burst (a large channel), YouTube may answer with a temporary "confirm you're not a bot" check. Those jobs are treated as transient and retry with backoff.

Re-indexing a video (`POST /admin/knowledge/:id/process` or `npm run reindex-sources`) reuses the transcript already stored, so it makes no new YouTube requests. If a re-index fails, the previous index stays searchable. To fetch fresh captions, delete the source and add it again.

No YouTube API key is needed. Caption availability depends on YouTube, and an unofficial endpoint can change; the provider is isolated in `services/transcript.service.js`.

## Documents

| Type | Library | Notes |
|---|---|---|
| PDF | `pdf-parse` | Text per page, with page numbers kept for citations. Scanned PDFs without a text layer are rejected; no OCR. |
| DOCX | `mammoth` | Raw text extraction |
| TXT / MD | — | Read as UTF-8 |

Files are checked by extension, MIME type **and** file signature. Size and page limits come from the environment variables and the platform settings.

## API overview

All routes live under `/api/v1`; full details are in [docs/API.md](docs/API.md).

- **Public:** `GET /health`, `GET /health/ready`, plus these auth routes: `POST /auth/login | refresh | forgot-password | reset-password | validate-invitation | accept-invitation`.
- **Signed-in user:**
  - `/auth/me`, `/auth/logout`, `/users/me`, `/users/me/overview`
  - `POST /chat`, `POST /messages/:id/feedback`
  - `/conversations` (CRUD), `/sources` (access-filtered, plus chunks and download), `/notifications`
- **Admin:** `/admin/users`, `/admin/invitations`, `/admin/knowledge` (YouTube, documents, text, process, retry, enable/disable), `/admin/processing`, `/admin/conversations` (review), `/admin/content-gaps` (unanswered questions grouped for content planning), `/admin/analytics`, `/admin/audit-logs`, `/admin/settings`, `/admin/search`. Most admin list routes accept `?format=csv`.

Example:

```bash
TOKEN=$(curl -s localhost:4001/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"you@company.com","password":"…"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')

curl -s localhost:4001/api/v1/chat -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"message":"What is our refund policy?"}'
```

**Roles:**
- `admin`: everything.
- `member`: chats, and reads the sources they can access.
- `readonly`: reads sources and history, but cannot ask questions.

**Source visibility:**
- `workspace`: all active users can see it.
- `restricted`: only the allowed users can see it (users with `sourceAccess = restricted` see only the sources granted to them).
- `private`: admins only.

Every sensitive admin action is written to the append-only audit log.

## Testing

```bash
npm run lint
npm test                 # unit + integration + security (vitest)
npm run test:unit
npm run test:integration
npm run test:live        # end-to-end against the running server with real OpenAI (start the server first)
```

- The vitest suites use the **real database and real Supabase Auth**, with OpenAI mocked by deterministic vectors. Each run creates users, sources and conversations tagged with a unique run marker and deletes them afterwards.
- `test:live` exercises the whole platform over HTTP, including real embeddings, real answers and a real YouTube transcript, and cleans up after itself.
- Audit log rows from test runs remain, because that table is append-only by design.

## Deployment

- Run `npm ci && npm run db:migrate && npm start`. Set every variable from `.env.example` in the host's secret store, and set `NODE_ENV=production` and `TRUST_PROXY=true` behind a proxy.
- Add the production frontend origins to `CLIENT_URL`, `ADMIN_URL` or `EXTRA_CORS_ORIGINS`, and the reset URL to the Supabase redirect list.
- The worker runs inside the API process. With several instances, either set `WORKER_ENABLED=false` on all but one, or keep it on everywhere; jobs are claimed with `FOR UPDATE SKIP LOCKED`, so no job runs twice.
- Health checks: `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (database, migrations, auth, OpenAI).
- Re-embed everything after changing the embedding model: `npm run reindex-sources`.

## Limitations

- No OCR for scanned PDFs, and no audio transcription for YouTube videos without captions; paste a transcript instead.
- Email goes through one SMTP account (Gmail allows about 500 messages a day). For larger volumes, switch `SMTP_*` to a transactional provider such as SES, Postmark or Mailgun.
- Retrieval uses RRF fusion of vector and full-text results, with no separate cross-encoder reranker.
- Rate limits are kept in process memory. Use a shared store if you run several instances and need global limits.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `verify-config` fails on the database | Check `DATABASE_URL`: use the pooler host, port 6543, and URL-encode the password. |
| Server exits with "migrations not applied" | Run `npm run db:migrate`. |
| Browser CORS error | The frontend origin must equal `CLIENT_URL`, `ADMIN_URL` or an entry in `EXTRA_CORS_ORIGINS` (scheme, host and port). |
| `AI_UNAVAILABLE` / `QUOTA_EXCEEDED` | OpenAI key, quota or network problem. The question is saved; retry with the same `clientMessageId`. |
| YouTube job fails with "no captions" | Add the video again and paste its transcript. |
| Sources stuck in `processing` | Make sure `WORKER_ENABLED=true`. Stale jobs are re-queued after `JOB_STALE_MINUTES`. |
| Emails are not arriving | Run `npm run verify-config` (SMTP login) and `npm run mail:test -- --to you@domain`. For Gmail, `SMTP_PASS` must be an App Password; check the recipient's spam folder. |
| Password reset link says invalid or expired | Reset links work once and expire after about an hour. Request a new one. |
