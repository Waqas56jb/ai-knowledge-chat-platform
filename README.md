# ai-knowledge-chat-platform

NEXUS AI is an AI workspace for asking questions about your own videos, documents and business knowledge. Every answer is grounded in your sources and cites them.

| Folder | What | Dev URL |
|---|---|---|
| [`server/`](server/) | Node.js API (Express + Supabase Postgres/pgvector/Auth/Storage + OpenAI) | http://localhost:4001/api/v1 |
| [`client/`](client/) | User app (React 18 + Vite): landing page, sign-in, chat, history, sources, profile | http://localhost:5187 |
| [`admin/`](admin/) | Admin panel (React 18 + Vite + Tailwind): users, invitations, knowledge, processing, review, analytics, audit, settings | http://localhost:5188 |

All data comes from the API, and neither frontend contains any mock or demo data. The secrets (the Supabase service-role key and the OpenAI key) live only in `server/.env`. The frontends only receive `VITE_API_BASE_URL`.

## Run locally

```bash
# 1. API — see server/README.md for full setup (env, migrations, first admin)
cd server && npm install && npm run verify-config && npm run db:migrate && npm start

# 2. User app
cd client && npm install && npm run dev      # .env: VITE_API_BASE_URL=http://localhost:4001/api/v1

# 3. Admin panel
cd admin && npm install && npm run dev       # same VITE_API_BASE_URL
```

The first admin is created from the CLI with `npm run bootstrap-admin` in `server/`; there are no built-in credentials. Everyone else joins through an invitation that an admin creates in the admin panel. The link is emailed to them (Gmail SMTP, configured in `server/.env`), and password-reset emails work the same way.

## Docs

- [server/README.md](server/README.md): architecture, environment, database safety, Supabase setup, ingestion, testing, deployment, troubleshooting
- [server/docs/API.md](server/docs/API.md): the full REST API contract
- [admin/README.md](admin/README.md): admin panel structure

## Tests

```bash
cd server
npm run lint
npm test            # unit + integration + security against the real database (OpenAI mocked)
npm run test:live   # full end-to-end over HTTP with real OpenAI (server must be running)
```

## Deploying

Both frontends use clean URLs, so the host must serve `index.html` for unknown paths; `npm start` / `vite preview` already does this. Set `VITE_API_BASE_URL` at build time, and add the frontend origins to the server's CORS variables (`CLIENT_URL`, `ADMIN_URL`, `EXTRA_CORS_ORIGINS`).
