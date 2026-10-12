# DTS AI — Admin Panel (frontend)

Administration console for DTS AI, the AI knowledge assistant for entrepreneurs in the pharmaceutical and medical supply resale business, with a focus on diabetic testing supplies (DTS). Manage users and invitation-based access, curate knowledge sources, watch processing jobs, review conversations, and read analytics and audit logs.

Every screen is driven by the DTS AI API (`server/`, contract in [`server/docs/API.md`](../server/docs/API.md)). There is no mock data in this app.

## Quick start

```bash
cd admin
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:4001/api/v1
npm install
npm run dev            # http://localhost:5188 (strict: the API's CORS allow-list expects this port)
npm run build          # production build → admin/dist
npm run preview        # serve the build (http://localhost:4180, or $PORT)
npm run lint           # ESLint
```

The API server must be running. Sign in with an account whose role is `admin` (the server's bootstrap script creates the first administrator; see `server/README.md`). Accounts with any other role are signed out with "Admin access required".

## Tech stack

React 18 · Vite 5 · React Router 6 · Tailwind CSS 3 (design tokens via CSS variables, light/dark) · Lucide icons · Framer Motion · Recharts · React Hook Form + Zod · date-fns · Sonner toasts.

## Routes and endpoints

| Route | Page | API |
|---|---|---|
| `/login`, `/forgot-password` | Public auth pages | `POST /auth/login`, `POST /auth/forgot-password` |
| `/admin/dashboard` | KPIs, charts, needs-attention, recent users, activity, system status | `GET /admin/analytics/overview`, `/admin/users`, `/admin/audit-logs`, `/admin/processing?status=failed`, `/admin/conversations?review=flagged`, `/admin/invitations`, `GET /health/ready` |
| `/admin/users`, `/admin/users/:userId` | User management and detail | `/admin/users` (list, `GET/PATCH/DELETE /:id`, `POST /:id/suspend|reactivate|revoke`) |
| `/admin/invitations`, `/admin/invitations/new` | Invitations | `/admin/invitations` (list, create, `GET /:id`, `POST /:id/resend|revoke`) |
| `/admin/knowledge`, `/admin/knowledge/add`, `/admin/knowledge/:sourceId` | Knowledge inventory, add wizard, source detail | `/admin/knowledge` (list, `POST /youtube|documents|text`, `GET/PATCH/DELETE /:id`, `POST /:id/process|retry|disable|enable`, `GET /:id/download`), `GET /sources/:id/chunks` |
| `/admin/processing` | Processing jobs (`?job=<id>` opens a job) | `/admin/processing` (list, `GET /:id`, `POST /:id/retry|cancel`) |
| `/admin/conversations`, `/admin/conversations/:id` | Conversation review | `/admin/conversations` (list, `GET /:id`, `POST /:id/review`) |
| `/admin/analytics` | Analytics and reports | `GET /admin/analytics/overview?range=…` |
| `/admin/audit` | Audit logs | `/admin/audit-logs` (list, `GET /:id`) |
| `/admin/settings/*` | Profile, platform, knowledge, security, domain policy, chat limits, appearance | `GET/PATCH /users/me`, `GET/PATCH /admin/settings`, `POST /admin/settings/reset` |
| header | Notifications, global search | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET /admin/search?q=` |

## How data flows

- `src/services/api.js` is the only HTTP client. It reads `VITE_API_BASE_URL`, sends the Bearer access token, refreshes it once via `POST /auth/refresh` on a 401 (concurrent requests share one refresh), and clears the session when refresh fails, which sends the user to `/login`. Errors are `ApiError` instances with `code`, `status` and `details`.
- `src/services/sessionStore.js` keeps the session returned by the API (`localStorage` with "Remember me", otherwise `sessionStorage`). On load, `GET /auth/me` re-validates it.
- Each `src/services/*Service.js` maps API responses to the shapes the components use.
- `useQuery` refetches after any successful mutation and can poll (`refetchInterval`). Knowledge sources, processing jobs and source details poll while work is queued or running.
- Lists are paginated, filtered and sorted on the server (`useServerTable`).

## CSV export

Users, invitations, knowledge sources, processing jobs, conversations, audit logs and analytics export through the API's `?format=csv` (same filters as the table, all matching rows), downloaded with auth and saved as a file. "Export selected" on the users table builds a CSV of the selected rows in the browser.

## Invitations

The server stores only a hash of each invitation token. The link and token are returned once — when the invitation is created or resent — and shown with copy buttons. No email is sent: the administrator shares the link.

## Appearance

Theme, sidebar default and density are personal display preferences stored in this browser (`localStorage`), not server data.

## Production hosting (SPA rewrites)

The app uses clean URLs, so the host must serve `index.html` for unknown paths:

- **`npm run preview`** (Vite) already falls back to `index.html`; it honours `$PORT` (Railway, Render).
- **Netlify:** `public/_redirects` → `/*  /index.html  200`
- **Vercel:** `vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Nginx:** `location / { try_files $uri /index.html; }`

Set `VITE_API_BASE_URL` at build time and add the admin origin to the server's CORS allow-list. Never put secrets in frontend env files: everything in them is public.

## Project structure

```
src/
├── App.jsx, main.jsx         providers (auth, breadcrumbs, confirm dialog, toasts) and bootstrap
├── routes/                   AppRoutes (lazy pages) and guards
├── layouts/                  AdminLayout (sidebar + header), AuthLayout
├── components/
│   ├── common/               Button, Card, DataTable, Pagination, Filters, Modal, ConfirmDialog, DropdownMenu,
│   │                         StatCard, ChartCard, StatusBadge, Avatar, Tabs, DateRangeFilter, States, Misc …
│   ├── forms/                FormField, Input, Textarea, Select, Checkbox, Switch
│   ├── layout/               AdminSidebar, AdminHeader, Breadcrumbs, GlobalSearch, NotificationMenu, Logo
│   └── dashboard|users|invitations|knowledge|conversations|analytics|audit|settings/
├── pages/                    one folder per section (see Routes)
├── services/                 api client, session store and one service per API area
├── constants/                enums and labels that mirror the API contract
├── hooks/                    useQuery, useServerTable, useAuth, useBreadcrumb, misc
├── utils/                    format, csv, validation, cn
└── styles/index.css          design tokens (light/dark) and component classes
```

See [CONVENTIONS.md](CONVENTIONS.md) for how pages are built.
