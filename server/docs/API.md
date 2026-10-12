# NEXUS AI API (v1)

Base URL (development): `http://localhost:4001/api/v1` — frontends read it from `VITE_API_BASE_URL`.

## Conventions

- JSON in/out. Success: `{ "success": true, "data": …, "meta"?: … }`. Error: `{ "success": false, "error": { "code", "message", "requestId", "details"? } }`.
- Auth: `Authorization: Bearer <accessToken>` (Supabase access token, ~1 h). Refresh with `POST /auth/refresh`.
- Paginated lists accept `?page=1&pageSize=25` and return `meta: { page, pageSize, total, pageCount, …extra }`.
- Lists with `?format=csv` return a CSV file (`text/csv`, `Content-Disposition: attachment`) for the same filters (all matching rows).
- Common error codes: `UNAUTHORIZED` 401, `INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `ACCOUNT_SUSPENDED` 403, `NOT_FOUND`/`ROUTE_NOT_FOUND` 404, `CONFLICT` 409, `VALIDATION_ERROR` 422, `FILE_TOO_LARGE` 413, `UNSUPPORTED_FILE_TYPE` 415, `RATE_LIMITED`/`QUOTA_EXCEEDED` 429, `AI_UNAVAILABLE`/`SERVICE_UNAVAILABLE` 503 (retryable).
- Ids are UUIDs. Timestamps are ISO strings.
- Roles: `admin`, `member`, `readonly`. User statuses: `active`, `pending`, `suspended`, `revoked`.

## Auth (`/auth`)

| Method & path | Body | Returns |
|---|---|---|
| `POST /auth/login` | `{ email, password }` | `Session` |
| `POST /auth/refresh` | `{ refreshToken }` | `Session` |
| `POST /auth/logout` (auth) | — | `{ signedOut: true }` |
| `GET /auth/me` (auth) | — | `{ user: Profile, settings: PublicSettings }` |
| `POST /auth/forgot-password` | `{ email }` | `{ message }` (always 200) |
| `POST /auth/reset-password` | `{ accessToken, password }` — `accessToken` comes from the Supabase recovery link (`#access_token=…&type=recovery`) | `{ message }` |
| `POST /auth/validate-invitation` | `{ token }` | `{ email, role, expiresAt }` or 400 `INVITATION_INVALID / _EXPIRED / _REVOKED / _USED` |
| `POST /auth/accept-invitation` (alias `POST /auth/register`) | `{ token, fullName, password, email? }` | 201 `Session` (signed in) |

`Session = { accessToken, refreshToken, expiresAt (unix seconds), tokenType, user: Profile }`

`Profile = { id, email, fullName, role, status, avatarUrl, department, timezone, language, preferences: {}, createdAt, lastActiveAt }`

`PublicSettings = { platform: {displayName, description, defaultLanguage, invitationOnly, defaultInvitationExpiryDays, maxFileSizeMb, defaultVisibility}, knowledge: { citationDisplay, supportedTypes }, chat: { maxQuestionLength } }`

Password rules: 8–72 chars, at least one letter and one number. Invitation tokens look like `nxs_…` (also delivered as `CLIENT_URL/register?invite=<token>`).

## Current user (`/users`)

| | |
|---|---|
| `GET /users/me` | `Profile` |
| `PATCH /users/me` | body (all optional, unknown keys rejected): `{ fullName, department, timezone, language, avatarUrl, preferences }` → `Profile`. `preferences` is a free JSON object for UI settings (theme, density, enterToSend, showCitations, defaultScope, showFollowups…). Role/status/email cannot be changed here. |
| `GET /users/me/overview` | `{ counts: { conversations, questions, sources }, questionsLast7Days: [{ date: 'YYYY-MM-DD', count }], recentConversations: Conversation[], recentSources: [{ id, title, type, group, status, createdAt }] }` |
| `DELETE /users/me/conversations` | deletes all of the caller's conversations → `{ deleted }` |

## Chat

`POST /chat` (member/admin; read-only → 403). Body: `{ message, conversationId?, clientMessageId?, scope?: 'all'|'youtube'|'document'|'text'|'conversation' }`. Omit `conversationId` to start a new conversation (title = question). Send the same `clientMessageId` when retrying to avoid duplicates.

Returns:
```json
{
  "conversationId": "uuid",
  "conversation": { "id": "uuid", "title": "…" },
  "userMessage": Message,
  "message": Message,
  "answer": "Text with [1] markers…",
  "citations": [Citation],
  "outcome": "answered | insufficient_evidence | out_of_scope | error"
}
```
`Message = { id, role: 'user'|'assistant', content, citations: Citation[], outcome, replyTo, clientMessageId, createdAt, feedback: 'up'|'down'|null, followups: string[] }`

`Citation = { n, chunkId, sourceId, sourceTitle, sourceType, excerpt, startSeconds, endSeconds, pageNumber, timestamp ('2:15' or null), url (YouTube URL with &t= for videos, else null) }`

On 503 `AI_UNAVAILABLE`, `error.details = { conversationId, userMessageId, retryable: true }` (the question was saved; retry with the same `clientMessageId`).

`POST /chat/stream` has the same rules and body as `POST /chat`, but responds with Server-Sent Events (`text/event-stream`). The events, in order:
- `status` `{ stage: 'searching' | 'writing' }`
- `delta` `{ text }`: a preview of the answer as it is generated, with citation markers already renumbered. It is sent only when the outcome is `answered`.
- `citation` `{ citation: Citation }`: sent the first time each source is cited.
- `done` `{ …same as POST /chat }`: the validated, saved result. It replaces the preview, which can differ if validation rejects the answer.
- `error` `{ error: { code, message, status, details? } }`: sent instead of `done`, with the same codes and details as the JSON errors.

Authentication, role, rate-limit and body-validation failures happen before the stream starts, so they are ordinary JSON error responses. Errors after that point (such as `QUOTA_EXCEEDED`, an unknown conversation, or `AI_UNAVAILABLE`) arrive as an `error` event. If the client disconnects, the answer is still generated and saved.

`POST /messages/:id/feedback` `{ rating: 'up'|'down'|null, comment? }` → `{ feedback }` (null removes it).

## Conversations (`/conversations`, owner only)

| | |
|---|---|
| `GET /conversations?q=&page=&pageSize=` | `Conversation[]` + page meta |
| `POST /conversations` `{ title? }` | `Conversation` (201) |
| `GET /conversations/:id` | `Conversation & { messages: Message[] }` |
| `PATCH /conversations/:id` `{ title }` | `Conversation` |
| `DELETE /conversations/:id` | `{ deleted: true }` |
| `GET /conversations/:id/messages?limit=&before=<messageId>` | `Message[]` (chronological) |

`Conversation = { id, title, status, reviewStatus, createdAt, updatedAt, messageCount, sourceCount, citationCount, preview, lastOutcome }`

## Sources (`/sources`, access-filtered)

| | |
|---|---|
| `GET /sources?q=&type=&sort=title|createdAt|updatedAt&dir=&page=&pageSize=` | `Source[]`, `meta.counts: [{ type, n }]`. `type` = a source type or a group (`youtube`, `document`, `text`, `conversation`). Non-admins only see indexed sources. |
| `GET /sources/:id` | `Source & { linkedConversations: [{ id, title, updatedAt }] }` |
| `GET /sources/:id/chunks?page=&pageSize=` | `[{ id, index, content, tokenCount, startSeconds, endSeconds, pageNumber, url }]` |
| `GET /sources/:id/download` | `{ url, expiresInSeconds }` (short-lived signed URL; documents only) |

`Source = { id, title, description, type ('youtube'|'pdf'|'docx'|'txt'|'markdown'|'business_knowledge'|'client_conversation'), group, url, channelName, durationSeconds, visibility ('workspace'|'restricted'|'private'), status ('pending'|'processing'|'indexed'|'failed'|'disabled'), tags[], chunkCount, errorMessage, file: { name, size, type } | null, youtube: { videoId, thumbnail, transcriptLanguage, transcriptProvider, autoGenerated } | null, isChannel, ownerId, ownerName, createdAt, updatedAt, indexedAt }`

## Notifications (`/notifications`, own only)

`GET /notifications?unread=true` → `[{ id, type, title, message, link, metadata, read_at, created_at }]`, `meta.unread`. `PATCH /notifications/:id/read`, `POST /notifications/read-all`.

## Admin (all require role `admin`)

### Users `/admin/users`
- `GET ?q=&status=&role=&sort=name|email|createdAt|lastActiveAt|conversationCount|role|status&dir=&page=&pageSize=&format=csv` → `AdminUser[]`, `meta.stats: { total, active, suspended, revoked, pending_invitations }`
- `GET /:id` → `AdminUser & { allowedSourceIds, conversations: [{ id, title, reviewStatus, createdAt, updatedAt, messageCount, outcome }], invitations: [{ id, email, role, status, createdAt, expiresAt, acceptedAt, revokedAt, codeHint }], accessibleSources: [{ id, title, type, status, visibility }], activity: AuditRow[] }`
- `PATCH /:id` `{ fullName?, email?, role?, status?, department?, notes?, sourceAccess?: 'workspace'|'restricted', allowedSourceIds?: uuid[] }`
- `POST /:id/suspend`, `POST /:id/reactivate`, `POST /:id/revoke`, `DELETE /:id` (deletes the auth account; conversations cascade). You cannot change/suspend/delete yourself or remove the last active admin.

`AdminUser = { id, email, name, fullName, role, status, department, notes, sourceAccess, avatarUrl, timezone, language, createdAt, updatedAt, lastActiveAt, conversationCount, questionsAsked }`

### Invitations `/admin/invitations`
- `GET ?q=&status=pending|accepted|expired|revoked&page=&pageSize=&format=csv` → `Invitation[]`, `meta.stats: { total, pending, accepted, expired, revoked }`
- `POST` `{ email, role, expiresInDays?, message?, note? }` → 201 `Invitation & { token, url, delivery: 'manual' }` — **the token/url are returned only here and on resend** (only a hash is stored). No email is sent: the admin shares the link.
- `GET /:id`, `POST /:id/resend` `{ expiresInDays? }` (rotates the token → returns new `token` + `url`), `POST /:id/revoke`

`Invitation = { id, email, role, status, codeHint (last 4 chars), invitedBy, invitedByName, message, note, createdAt, expiresAt, acceptedAt, acceptedBy, revokedAt, resendCount, lastSentAt }`

### Knowledge `/admin/knowledge`
- `GET ?q=&type=&status=&ownerId=&added=7d|30d|90d&sort=title|createdAt|updatedAt|chunkCount|status|type&dir=&page=&pageSize=&format=csv` → `(Source & { activeJob: { id, status, progress, step } | null })[]`, `meta.stats: { total, indexed, pending, processing, failed, disabled, recent, chunks }`, `meta.owners: [{ id, name }]`
- `POST /youtube` `{ url (video or channel), title?, description?, tags?, visibility?, allowedUserIds?, transcript? (paste to skip automatic captions), maxVideos? (channels only, 1–500, default 50: newest uploads to index) }` → 201 `{ source, jobId }`. Re-processing a channel (`POST /:id/process`) adds new uploads and skips videos already present.
- `POST /documents` multipart: `file` (PDF/DOCX/TXT/MD) + fields `title?, description?, tags? (comma list or JSON array), visibility?, allowedUserIds?` → 201 `{ source, jobId }`
- `POST /text` `{ title, text, sourceType?: 'business_knowledge'|'txt'|'markdown'|'client_conversation', description?, category?, tags?, visibility?, allowedUserIds? }` → 201 `{ source, jobId }` (client conversations default to `restricted`)
- `GET /:id` → `Source & { notes, metadata, allowedUsers: [{ id, name, email }], jobs: Job[], relatedConversations: [{ id, title, userId, userName, updatedAt, citations }], content: { preview, length, language, provider } | null, channelVideos: [...], activity }`
- `PATCH /:id` `{ title?, description?, tags?, notes?, visibility?, allowedUserIds? }`, `DELETE /:id`
- `POST /:id/process` (index / re-index), `POST /:id/retry` (failed only), `POST /:id/disable`, `POST /:id/enable`, `GET /:id/download`

Duplicates (same video / same content) → 409 with `details.existingSourceId`.

### Processing `/admin/processing`
- `GET ?q=&status=&type=&sourceId=&page=&pageSize=&format=csv` → `Job[]`, `meta.stats: { total, queued, processing, completed, failed, cancelled }`
- `GET /:id` → `Job & { logs: [{ at, level, message }], result, source: { id, title }, retries: [{ id, status, createdAt }] }`
- `POST /:id/retry` (failed/cancelled → new job with `parentJobId`), `POST /:id/cancel` (queued only)

`Job = { id, sourceId, sourceTitle, type ('transcript_extraction'|'document_extraction'|'text_normalization'|'chunking'|'embedding'|'indexing'|'channel_discovery'), status ('queued'|'processing'|'completed'|'failed'|'cancelled'), progress (0-100), step, attempts, maxAttempts, error, parentJobId, createdAt, startedAt, completedAt, updatedAt }`

### Conversations (review) `/admin/conversations`
- `GET ?q=&userId=&outcome=&review=<status>|flagged&sourceGroup=&range=7d|30d|90d&sort=&dir=&page=&pageSize=&format=csv` → `Conversation & { userId, userName, userEmail }[]`, `meta.stats: { total, needs_review, unreviewed }`
- `GET /:id` (audited) → `Conversation & { user, messages: Message[], sources: [{ id, title, type, status }], reviewNotes: [{ id, note, createdAt, authorId, authorName }], activity }`
- `POST /:id/review` `{ status?: 'unreviewed'|'reviewed'|'needs_attention'|'unsupported'|'source_mismatch', note? }`

### Unanswered questions (content gaps) `/admin/content-gaps`
These are questions the knowledge base could not answer (assistant outcome `insufficient_evidence`), so admins can plan new content for them.
- Grouping ignores case, punctuation and spacing, so the same question asked by several users appears once.
- Questions are read from conversations: if the user deletes the conversation, the question disappears.

Endpoints:
- `GET ?q=&status=open|planned|covered|dismissed|all&range=7d|30d|90d&sort=lastAskedAt|askCount|firstAskedAt|userCount|question&dir=&page=&pageSize=&format=csv` → `Gap[]`, `meta.stats: { total, open, planned, covered, dismissed, askedLast7Days, unansweredQuestions }`
- `GET /:id` → `Gap & { occurrences: [{ messageId, question, askedAt, answered, conversationId, userId, userName }] }`
- `PATCH /:id` `{ status?, note? }` (`note: ""` clears it) → the detail. Audited as `content_gap.updated`.

`Gap` fields:
- `id`: 32-hex string.
- `question`: the latest wording.
- `status`, `note`.
- `askCount`, `userCount`: unanswered asks.
- `firstAskedAt`, `lastAskedAt`, `lastAnsweredAt`.
- `answeredSince`: the same question was answered after it last failed, so new content probably covers it.
- `askedAgainAfterCovered`: the gap was marked covered, but it still fails afterwards.
- `triagedAt`, `updatedById`, `updatedByName`.

### Analytics `/admin/analytics`
`GET /overview?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv` →
`{ range, days, from, to, hourly, demo: false, series: [{ date, label, newUsers, totalUsers, activeUsers, conversations, questions, answeredWithSources, noEvidence, outOfScope, failed }], totals, previous, kpis: { totalUsers, activeUsers, sources, conversations, questions, answered, unsupported, newRegistrations, citationRate, processingSuccess } (each { value, delta, hint?, suffix?, invert? }), sourceDistribution: [{ key, label, value }], outcomes: [{ key, label, value }], processing: [{ key, label, value }], topUsers: [{ id, name, questions, conversations }], topSources: [{ id, title, type, citations }] }`.
Also `/users`, `/conversations`, `/knowledge`, `/query-outcomes` (subsets).

### Audit `/admin/audit-logs` (read-only)
`GET ?q=&actorId=&action=&entityType=&entityId=&result=&from=&to=&page=&pageSize=&format=csv` → rows `{ id, actor_id, actor_email, actor_name, action, entity_type, entity_id, entity_label, details, result, request_id, ip, created_at }`, `meta.actors: [{ id, name }]`. `GET /:id`.

### Settings `/admin/settings`
- `GET` → `{ platform, knowledge, security, domain_policy, chat }`
- `PATCH` `{ section, values }` (partial values merged and validated) → `{ section, values }`
- `POST /reset` `{ section }`

Sections: `platform { displayName, description, defaultLanguage, invitationOnly, defaultInvitationExpiryDays, maxFileSizeMb, defaultVisibility }`, `knowledge { supportedTypes[], chunkSize, chunkOverlap (< chunkSize), retrievalCount, minSimilarity, citationDisplay: inline|footnotes|hidden, fallbackMessage }`, `security { sessionTimeoutMinutes, restrictSourcesByRole, readOnlyCanExport, auditLogVisibility }`, `domain_policy { enforceScope, allowedScope, blockedTopics[] }`, `chat { dailyQuestionLimitPerUser, maxQuestionLength }`.

### Search `/admin/search?q=` → `{ users, invitations, sources, conversations, jobs, total }` (each `[{ id, title, subtitle, to }]`, `to` is an admin route).
