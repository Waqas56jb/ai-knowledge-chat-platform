/** Shared enums. Must match the CHECK constraints in supabase/migrations. */
export const TABLE_PREFIX = 'ai_knowledge_chat_';
export const T = Object.freeze({
  profiles: 'public.ai_knowledge_chat_profiles',
  invitations: 'public.ai_knowledge_chat_invitations',
  sources: 'public.ai_knowledge_chat_sources',
  sourceAccess: 'public.ai_knowledge_chat_source_access',
  sourceContents: 'public.ai_knowledge_chat_source_contents',
  chunks: 'public.ai_knowledge_chat_chunks',
  conversations: 'public.ai_knowledge_chat_conversations',
  messages: 'public.ai_knowledge_chat_messages',
  feedback: 'public.ai_knowledge_chat_feedback',
  reviewNotes: 'public.ai_knowledge_chat_review_notes',
  jobs: 'public.ai_knowledge_chat_jobs',
  audit: 'public.ai_knowledge_chat_audit_logs',
  notifications: 'public.ai_knowledge_chat_notifications',
  settings: 'public.ai_knowledge_chat_settings',
  usage: 'public.ai_knowledge_chat_usage_events',
  contentGaps: 'public.ai_knowledge_chat_content_gaps'
});
/** Number of SQL files in supabase/migrations the code depends on. */
export const REQUIRED_MIGRATIONS = 5;
export const GAP_STATUSES = ['open', 'planned', 'covered', 'dismissed'];
export const FN = Object.freeze({
  accessibleSources: 'public.ai_knowledge_chat_accessible_source_ids',
  matchChunks: 'public.ai_knowledge_chat_match_chunks',
  searchChunks: 'public.ai_knowledge_chat_search_chunks'
});

export const ROLES = ['admin', 'member', 'readonly'];
export const USER_STATUSES = ['active', 'pending', 'suspended', 'revoked'];
export const SOURCE_TYPES = ['youtube', 'pdf', 'docx', 'txt', 'markdown', 'business_knowledge', 'client_conversation'];
export const SOURCE_STATUSES = ['pending', 'processing', 'indexed', 'failed', 'disabled'];
export const VISIBILITIES = ['workspace', 'restricted', 'private'];
export const JOB_TYPES = ['transcript_extraction', 'document_extraction', 'text_normalization', 'chunking', 'embedding', 'indexing', 'channel_discovery'];
export const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed', 'cancelled'];
export const OUTCOMES = ['answered', 'insufficient_evidence', 'out_of_scope', 'error'];
export const REVIEW_STATUSES = ['unreviewed', 'reviewed', 'needs_attention', 'unsupported', 'source_mismatch'];

/** Allowed job status transitions. */
export const JOB_TRANSITIONS = Object.freeze({
  queued: ['processing', 'cancelled'],
  processing: ['completed', 'failed', 'queued'],
  failed: [],
  completed: [],
  cancelled: []
});

export const PIPELINE_STEPS = ['Fetch content', 'Extract text', 'Normalize', 'Generate chunks', 'Create embeddings', 'Write to index'];

export const FALLBACK_ANSWER = "The indexed knowledge does not contain enough information to answer this. Try rephrasing the question or ask about a topic covered by your knowledge sources.";
export const OUT_OF_SCOPE_ANSWER = 'This assistant only answers questions about the approved knowledge base for this workspace, so it cannot help with that request.';
