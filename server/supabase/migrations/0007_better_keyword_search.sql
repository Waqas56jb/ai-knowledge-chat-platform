-- 0007: better keyword search for short questions.
-- websearch_to_tsquery() ANDs every word, so a question like "how do I find pharmacies to sell test strips to"
-- matched no chunk at all unless one passage contained every word. Words are now ORed and ranked by how many
-- (and how close) they match, and a match in the source title (e.g. a video called "... Pharmacies ...") is
-- boosted, so the most relevant sources surface for short questions. Same signature: replaces 0003's function.

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
  with q as (
    select nullif(replace(websearch_to_tsquery('english', p_query)::text, ' & ', ' | '), '')::tsquery as tsq
  )
  select c.id, c.source_id, c.chunk_index, c.content, c.start_seconds, c.end_seconds, c.page_number,
         s.title, s.source_type, s.source_url, s.metadata,
         (ts_rank_cd(c.fts, q.tsq, 32) + 0.6 * ts_rank(to_tsvector('english', coalesce(s.title, '')), q.tsq, 1))::real as rank
  from public.ai_knowledge_chat_chunks c
  join public.ai_knowledge_chat_sources s on s.id = c.source_id
  cross join q
  where q.tsq is not null
    and s.status = 'indexed'
    and (c.fts @@ q.tsq or to_tsvector('english', coalesce(s.title, '')) @@ q.tsq)
    and c.source_id in (select public.ai_knowledge_chat_accessible_source_ids(p_user_id))
  order by rank desc
  limit greatest(1, least(p_match_count, 50));
$$;

revoke all on function public.ai_knowledge_chat_search_chunks(uuid, text, integer) from public, anon, authenticated;
