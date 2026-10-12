-- 0006: business profiles — a hidden, per-user summary of who the user is and what their business looks like,
-- built by the AI from the user's own chat messages. Used to personalise answers and to let admins filter users.
-- Never exposed through user-facing endpoints. Additive only.

create table if not exists public.ai_knowledge_chat_user_insights (
  user_id            uuid primary key references public.ai_knowledge_chat_profiles (id) on delete cascade,
  business_name      text check (char_length(business_name) <= 200),
  business_type      text check (char_length(business_type) <= 120),
  user_role          text check (char_length(user_role) <= 120),
  city               text check (char_length(city) <= 120),
  state              text check (char_length(state) <= 120),
  country            text check (char_length(country) <= 120),
  business_stage     text check (business_stage in ('starting', 'growing', 'established')),
  products           text[] not null default '{}',
  client_types       text[] not null default '{}',
  monthly_volume     text check (char_length(monthly_volume) <= 120),
  team_size          text check (char_length(team_size) <= 120),
  summary            text check (char_length(summary) <= 2000),
  manual_fields      text[] not null default '{}',   -- fields an admin edited: the AI never overwrites them
  messages_analyzed  integer not null default 0,
  last_message_at    timestamptz,                    -- newest user message included in the profile
  generated_at       timestamptz,
  model              text,
  processing_until   timestamptz,                    -- claim marker so only one worker updates a profile at a time
  updated_by         uuid references public.ai_knowledge_chat_profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists ai_knowledge_chat_user_insights_country_idx on public.ai_knowledge_chat_user_insights (lower(country));
create index if not exists ai_knowledge_chat_user_insights_state_idx on public.ai_knowledge_chat_user_insights (lower(state));
create index if not exists ai_knowledge_chat_user_insights_type_idx on public.ai_knowledge_chat_user_insights (lower(business_type));
create index if not exists ai_knowledge_chat_user_insights_stage_idx on public.ai_knowledge_chat_user_insights (business_stage);
create index if not exists ai_knowledge_chat_user_insights_products_idx on public.ai_knowledge_chat_user_insights using gin (products);
create index if not exists ai_knowledge_chat_user_insights_clients_idx on public.ai_knowledge_chat_user_insights using gin (client_types);

create or replace trigger ai_knowledge_chat_user_insights_touch before update on public.ai_knowledge_chat_user_insights
  for each row execute function public.ai_knowledge_chat_touch_updated_at();

alter table public.ai_knowledge_chat_user_insights enable row level security;
revoke all on table public.ai_knowledge_chat_user_insights from anon, authenticated;
