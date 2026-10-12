-- NEXUS AI (ai_knowledge_chat_*) — enable pgvector for semantic retrieval.
-- Additive only: installs the `vector` type/operators into the shared `extensions` schema
-- (Supabase convention). It does not touch any existing table. Approved by the project owner.
create extension if not exists vector with schema extensions;
