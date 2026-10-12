-- NEXUS AI (ai_knowledge_chat_*) — core schema.
-- Every object is prefixed with ai_knowledge_chat_ so it can never collide with the other
-- projects that share this database. Only CREATE ... IF NOT EXISTS; nothing is dropped.

-- Profiles: one row per Supabase Auth user that belongs to this app.
create table if not exists public.ai_knowledge_chat_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'readonly')),
  status text not null default 'active' check (status in ('active', 'pending', 'suspended', 'revoked')),
  avatar_url text,
  department text not null default '',
  notes text not null default '',
  source_access text not null default 'workspace' check (source_access in ('workspace', 'restricted')),
  timezone text not null default 'UTC',
  language text not null default 'English',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);
create unique index if not exists ai_knowledge_chat_profiles_email_key on public.ai_knowledge_chat_profiles (lower(email));
create index if not exists ai_knowledge_chat_profiles_created_idx on public.ai_knowledge_chat_profiles (created_at desc);

-- Invitations: only a SHA-256 hash of the token is stored.
create table if not exists public.ai_knowledge_chat_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('admin', 'member', 'readonly')),
  token_hash text not null unique,
  token_hint text not null,
  invited_by uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  message text not null default '',
  note text not null default '',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  revoked_at timestamptz,
  resend_count integer not null default 0,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ai_knowledge_chat_invitations_state_chk check (not (accepted_at is not null and revoked_at is not null))
);
create index if not exists ai_knowledge_chat_invitations_email_idx on public.ai_knowledge_chat_invitations (lower(email));
create index if not exists ai_knowledge_chat_invitations_created_idx on public.ai_knowledge_chat_invitations (created_at desc);
-- at most one open (not accepted, not revoked) invitation per email
create unique index if not exists ai_knowledge_chat_invitations_open_email_key
  on public.ai_knowledge_chat_invitations (lower(email)) where accepted_at is null and revoked_at is null;

-- Knowledge sources
create table if not exists public.ai_knowledge_chat_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '',
  source_type text not null check (source_type in ('youtube', 'pdf', 'docx', 'txt', 'markdown', 'business_knowledge', 'client_conversation')),
  source_url text,
  storage_path text,
  channel_name text,
  duration_seconds integer,
  visibility text not null default 'workspace' check (visibility in ('workspace', 'restricted', 'private')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'indexed', 'failed', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  error_message text,
  notes text not null default '',
  content_hash text,
  chunk_count integer not null default 0,
  owner_id uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  created_by uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  indexed_at timestamptz
);
create index if not exists ai_knowledge_chat_sources_status_idx on public.ai_knowledge_chat_sources (status);
create index if not exists ai_knowledge_chat_sources_type_idx on public.ai_knowledge_chat_sources (source_type);
create index if not exists ai_knowledge_chat_sources_created_idx on public.ai_knowledge_chat_sources (created_at desc);
create unique index if not exists ai_knowledge_chat_sources_youtube_key
  on public.ai_knowledge_chat_sources ((metadata ->> 'videoId')) where source_type = 'youtube' and metadata ? 'videoId';

-- Users explicitly allowed to use a "restricted" source
create table if not exists public.ai_knowledge_chat_source_access (
  source_id uuid not null references public.ai_knowledge_chat_sources (id) on delete cascade,
  user_id uuid not null references public.ai_knowledge_chat_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_id, user_id)
);
create index if not exists ai_knowledge_chat_source_access_user_idx on public.ai_knowledge_chat_source_access (user_id);

-- Extracted text kept for re-processing (documents' originals live in private Storage)
create table if not exists public.ai_knowledge_chat_source_contents (
  source_id uuid primary key references public.ai_knowledge_chat_sources (id) on delete cascade,
  content text not null,
  segments jsonb not null default '[]'::jsonb,
  language text,
  provider text,
  updated_at timestamptz not null default now()
);

-- Chunks with embeddings (text-embedding-3-small = 1536 dimensions)
create table if not exists public.ai_knowledge_chat_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.ai_knowledge_chat_sources (id) on delete cascade,
  chunk_index integer not null,
  content text not null check (char_length(content) > 0),
  token_count integer,
  start_seconds integer,
  end_seconds integer,
  page_number integer,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);
create index if not exists ai_knowledge_chat_chunks_source_idx on public.ai_knowledge_chat_chunks (source_id);
create index if not exists ai_knowledge_chat_chunks_fts_idx on public.ai_knowledge_chat_chunks using gin (fts);
create index if not exists ai_knowledge_chat_chunks_embedding_idx on public.ai_knowledge_chat_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Conversations and messages
create table if not exists public.ai_knowledge_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_knowledge_chat_profiles (id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'archived')),
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed', 'reviewed', 'needs_attention', 'unsupported', 'source_mismatch')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_conversations_user_idx on public.ai_knowledge_chat_conversations (user_id, updated_at desc);
create index if not exists ai_knowledge_chat_conversations_updated_idx on public.ai_knowledge_chat_conversations (updated_at desc);

create table if not exists public.ai_knowledge_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_knowledge_chat_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  outcome text check (outcome in ('answered', 'insufficient_evidence', 'out_of_scope', 'error')),
  client_message_id text,
  reply_to uuid references public.ai_knowledge_chat_messages (id) on delete set null,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_messages_conv_idx on public.ai_knowledge_chat_messages (conversation_id, created_at);
create index if not exists ai_knowledge_chat_messages_created_idx on public.ai_knowledge_chat_messages (created_at desc);
create unique index if not exists ai_knowledge_chat_messages_idem_key
  on public.ai_knowledge_chat_messages (conversation_id, client_message_id) where client_message_id is not null;

create table if not exists public.ai_knowledge_chat_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_knowledge_chat_messages (id) on delete cascade,
  user_id uuid not null references public.ai_knowledge_chat_profiles (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.ai_knowledge_chat_review_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_knowledge_chat_conversations (id) on delete cascade,
  author_id uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_review_notes_conv_idx on public.ai_knowledge_chat_review_notes (conversation_id, created_at);

-- Processing jobs (PostgreSQL-backed queue, claimed atomically with SKIP LOCKED)
create table if not exists public.ai_knowledge_chat_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.ai_knowledge_chat_sources (id) on delete cascade,
  job_type text not null check (job_type in ('transcript_extraction', 'document_extraction', 'text_normalization', 'chunking', 'embedding', 'indexing', 'channel_discovery')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  current_step text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  error_message text,
  parent_job_id uuid references public.ai_knowledge_chat_jobs (id) on delete set null,
  requested_by uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  locked_by text,
  locked_at timestamptz,
  run_after timestamptz not null default now(),
  logs jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_jobs_queue_idx on public.ai_knowledge_chat_jobs (status, run_after, created_at);
create index if not exists ai_knowledge_chat_jobs_source_idx on public.ai_knowledge_chat_jobs (source_id, created_at desc);
-- never two active jobs for the same source
create unique index if not exists ai_knowledge_chat_jobs_active_source_key
  on public.ai_knowledge_chat_jobs (source_id) where status in ('queued', 'processing');

-- Audit log (append-only, enforced by trigger in 0003)
create table if not exists public.ai_knowledge_chat_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_label text,
  details jsonb not null default '{}'::jsonb,
  result text not null default 'success' check (result in ('success', 'failure')),
  request_id text,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_audit_created_idx on public.ai_knowledge_chat_audit_logs (created_at desc);
create index if not exists ai_knowledge_chat_audit_entity_idx on public.ai_knowledge_chat_audit_logs (entity_type, entity_id);
create index if not exists ai_knowledge_chat_audit_actor_idx on public.ai_knowledge_chat_audit_logs (actor_id);

create table if not exists public.ai_knowledge_chat_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ai_knowledge_chat_profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_notifications_user_idx on public.ai_knowledge_chat_notifications (user_id, created_at desc);

-- Platform settings (validated server-side; never contains secrets)
create table if not exists public.ai_knowledge_chat_settings (
  key text primary key check (key in ('platform', 'knowledge', 'security', 'domain_policy', 'chat')),
  value jsonb not null,
  scope text not null default 'admin' check (scope in ('public', 'admin')),
  updated_by uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- AI usage events for quotas and cost tracking
create table if not exists public.ai_knowledge_chat_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  kind text not null check (kind in ('chat', 'embedding_query', 'embedding_index')),
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  source_id uuid references public.ai_knowledge_chat_sources (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_knowledge_chat_usage_user_idx on public.ai_knowledge_chat_usage_events (user_id, created_at desc);
