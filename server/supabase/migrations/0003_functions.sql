-- NEXUS AI (ai_knowledge_chat_*) — access-control and retrieval functions, triggers.
-- The access function is the single source of truth for "which sources may this user use";
-- the source API and RAG retrieval both call it, so retrieval can never see more than the API.

-- Sources a given profile may read/query.
create or replace function public.ai_knowledge_chat_accessible_source_ids(p_user_id uuid)
returns setof uuid
language sql stable
set search_path = public, extensions
as $$
  select s.id
  from public.ai_knowledge_chat_sources s
  join public.ai_knowledge_chat_profiles p on p.id = p_user_id and p.status = 'active'
  where s.status <> 'disabled'
    and (
      p.role = 'admin'
      or (s.visibility = 'workspace' and p.source_access = 'workspace')
      or (s.visibility in ('workspace', 'restricted') and exists (
            select 1 from public.ai_knowledge_chat_source_access a where a.source_id = s.id and a.user_id = p_user_id))
      or (s.visibility = 'private' and s.owner_id = p_user_id)
    );
$$;

-- Vector similarity search restricted to the user's accessible, indexed sources.
create or replace function public.ai_knowledge_chat_match_chunks(
  p_user_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer default 12,
  p_min_similarity double precision default 0.0
)
returns table (
  chunk_id uuid, source_id uuid, chunk_index integer, content text, start_seconds integer, end_seconds integer,
  page_number integer, source_title text, source_type text, source_url text, metadata jsonb, similarity double precision
)
language sql stable
set search_path = public, extensions
as $$
  select c.id, c.source_id, c.chunk_index, c.content, c.start_seconds, c.end_seconds, c.page_number,
         s.title, s.source_type, s.source_url, s.metadata,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from public.ai_knowledge_chat_chunks c
  join public.ai_knowledge_chat_sources s on s.id = c.source_id
  where s.status = 'indexed'
    and c.embedding is not null
    and c.source_id in (select public.ai_knowledge_chat_accessible_source_ids(p_user_id))
    and 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  order by c.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 50));
$$;

-- Full-text search with the same access restriction (hybrid retrieval).
create or replace function public.ai_knowledge_chat_search_chunks(
  p_user_id uuid,
  p_query text,
  p_match_count integer default 8
)
returns table (
  chunk_id uuid, source_id uuid, chunk_index integer, content text, start_seconds integer, end_seconds integer,
  page_number integer, source_title text, source_type text, source_url text, metadata jsonb, rank real
)
language sql stable
set search_path = public, extensions
as $$
  with q as (select websearch_to_tsquery('english', p_query) as tsq)
  select c.id, c.source_id, c.chunk_index, c.content, c.start_seconds, c.end_seconds, c.page_number,
         s.title, s.source_type, s.source_url, s.metadata, ts_rank_cd(c.fts, q.tsq) as rank
  from public.ai_knowledge_chat_chunks c
  join public.ai_knowledge_chat_sources s on s.id = c.source_id
  cross join q
  where s.status = 'indexed'
    and c.fts @@ q.tsq
    and c.source_id in (select public.ai_knowledge_chat_accessible_source_ids(p_user_id))
  order by rank desc
  limit greatest(1, least(p_match_count, 50));
$$;

-- Keep updated_at fresh.
create or replace function public.ai_knowledge_chat_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger ai_knowledge_chat_profiles_touch before update on public.ai_knowledge_chat_profiles
  for each row execute function public.ai_knowledge_chat_touch_updated_at();
create or replace trigger ai_knowledge_chat_sources_touch before update on public.ai_knowledge_chat_sources
  for each row execute function public.ai_knowledge_chat_touch_updated_at();
create or replace trigger ai_knowledge_chat_jobs_touch before update on public.ai_knowledge_chat_jobs
  for each row execute function public.ai_knowledge_chat_touch_updated_at();

-- Audit history is append-only: block UPDATE and DELETE (TRUNCATE is not granted to app roles).
create or replace function public.ai_knowledge_chat_block_audit_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'ai_knowledge_chat_audit_logs is append-only';
end;
$$;

create or replace trigger ai_knowledge_chat_audit_logs_immutable before update or delete on public.ai_knowledge_chat_audit_logs
  for each row execute function public.ai_knowledge_chat_block_audit_changes();
