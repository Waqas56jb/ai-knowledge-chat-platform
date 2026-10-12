-- 0005: content gaps — questions the knowledge base could not answer.
-- The questions themselves are derived from ai_knowledge_chat_messages (user question + assistant reply with
-- outcome 'insufficient_evidence'), grouped by a normalised question key. This table only stores the admin's
-- triage state for each group (open / planned / covered / dismissed + note). Additive only.

create table if not exists public.ai_knowledge_chat_content_gaps (
  id           text primary key check (id ~ '^[0-9a-f]{32}$'),          -- md5(question_key)
  question_key text not null unique check (char_length(question_key) between 1 and 4000),
  question     text not null check (char_length(question) between 1 and 4000),
  status       text not null default 'open' check (status in ('open', 'planned', 'covered', 'dismissed')),
  note         text check (char_length(note) <= 2000),
  updated_by   uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ai_knowledge_chat_content_gaps_status_idx on public.ai_knowledge_chat_content_gaps (status, updated_at desc);

-- unanswered-question lookups scan assistant replies by outcome
create index if not exists ai_knowledge_chat_messages_outcome_idx on public.ai_knowledge_chat_messages (outcome, created_at desc);

create or replace trigger ai_knowledge_chat_content_gaps_touch before update on public.ai_knowledge_chat_content_gaps
  for each row execute function public.ai_knowledge_chat_touch_updated_at();

alter table public.ai_knowledge_chat_content_gaps enable row level security;
revoke all on table public.ai_knowledge_chat_content_gaps from anon, authenticated;
