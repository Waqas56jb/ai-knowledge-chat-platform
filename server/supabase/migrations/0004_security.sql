-- NEXUS AI (ai_knowledge_chat_*) — Row Level Security and privileges.
-- The Node.js server is the only intended client of these tables (it connects as the table owner and
-- enforces identity/role/visibility in every query). Defence in depth:
--   1. RLS is enabled on every table, so the public REST API (anon/authenticated keys) sees nothing
--      unless a policy allows it.
--   2. Table and function privileges are revoked from anon/authenticated.
--   3. Owner-only policies exist for user-owned data in case read access is ever granted deliberately.

alter table public.ai_knowledge_chat_profiles enable row level security;
alter table public.ai_knowledge_chat_invitations enable row level security;
alter table public.ai_knowledge_chat_sources enable row level security;
alter table public.ai_knowledge_chat_source_access enable row level security;
alter table public.ai_knowledge_chat_source_contents enable row level security;
alter table public.ai_knowledge_chat_chunks enable row level security;
alter table public.ai_knowledge_chat_conversations enable row level security;
alter table public.ai_knowledge_chat_messages enable row level security;
alter table public.ai_knowledge_chat_feedback enable row level security;
alter table public.ai_knowledge_chat_review_notes enable row level security;
alter table public.ai_knowledge_chat_jobs enable row level security;
alter table public.ai_knowledge_chat_audit_logs enable row level security;
alter table public.ai_knowledge_chat_notifications enable row level security;
alter table public.ai_knowledge_chat_settings enable row level security;
alter table public.ai_knowledge_chat_usage_events enable row level security;

revoke all on table
  public.ai_knowledge_chat_profiles, public.ai_knowledge_chat_invitations, public.ai_knowledge_chat_sources,
  public.ai_knowledge_chat_source_access, public.ai_knowledge_chat_source_contents, public.ai_knowledge_chat_chunks,
  public.ai_knowledge_chat_conversations, public.ai_knowledge_chat_messages, public.ai_knowledge_chat_feedback,
  public.ai_knowledge_chat_review_notes, public.ai_knowledge_chat_jobs, public.ai_knowledge_chat_audit_logs,
  public.ai_knowledge_chat_notifications, public.ai_knowledge_chat_settings, public.ai_knowledge_chat_usage_events
from anon, authenticated;

revoke all on function public.ai_knowledge_chat_accessible_source_ids(uuid) from public, anon, authenticated;
revoke all on function public.ai_knowledge_chat_match_chunks(uuid, extensions.vector, integer, double precision) from public, anon, authenticated;
revoke all on function public.ai_knowledge_chat_search_chunks(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.ai_knowledge_chat_touch_updated_at() from public, anon, authenticated;
revoke all on function public.ai_knowledge_chat_block_audit_changes() from public, anon, authenticated;

-- Owner-only read policies (inactive while privileges are revoked; documented intent).
create policy ai_knowledge_chat_profiles_self_read on public.ai_knowledge_chat_profiles
  for select to authenticated using (id = auth.uid());
create policy ai_knowledge_chat_conversations_owner_read on public.ai_knowledge_chat_conversations
  for select to authenticated using (user_id = auth.uid());
create policy ai_knowledge_chat_messages_owner_read on public.ai_knowledge_chat_messages
  for select to authenticated using (exists (
    select 1 from public.ai_knowledge_chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_knowledge_chat_notifications_owner_read on public.ai_knowledge_chat_notifications
  for select to authenticated using (user_id = auth.uid());
create policy ai_knowledge_chat_feedback_owner_read on public.ai_knowledge_chat_feedback
  for select to authenticated using (user_id = auth.uid());
