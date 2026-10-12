/**
 * Enumerations and display labels that mirror the API contract (server/src/config/constants.js and
 * server/docs/API.md). These are vocabularies, not data: every record shown in the console comes from
 * the API.
 */

/* users */
export const ROLES = ['admin', 'member', 'readonly'];
export const ROLE_LABELS = { admin: 'Administrator', member: 'Member', readonly: 'Read-only' };
export const roleLabel = r => ROLE_LABELS[r] || r || '—';
export const USER_STATUSES = ['active', 'pending', 'suspended', 'revoked'];
export const SOURCE_ACCESS = { workspace: 'All workspace sources', restricted: 'Only selected sources' };

/* hidden business profile (built by AI from a member's own messages; never shown to the member) */
export const BUSINESS_STAGES = ['starting', 'growing', 'established'];
export const BUSINESS_STAGE_LABELS = { starting: 'Starting', growing: 'Growing', established: 'Established' };
/** Profile fields in display order: [key, label]. Keys match the PATCH / release body. */
export const BUSINESS_PROFILE_FIELDS = [
  ['businessName', 'Business name'], ['businessType', 'Business type'], ['userRole', 'Their role'],
  ['city', 'City'], ['state', 'State / region'], ['country', 'Country'], ['businessStage', 'Stage'],
  ['products', 'Products'], ['clientTypes', 'Client types'], ['monthlyVolume', 'Monthly volume'], ['teamSize', 'Team size'], ['summary', 'Summary']
];
export const businessFieldLabel = k => (BUSINESS_PROFILE_FIELDS.find(([f]) => f === k) || [k, k])[1];

/* invitations */
export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'];
export const EXPIRY_OPTIONS = [[1, '24 hours'], [3, '3 days'], [7, '7 days'], [14, '14 days'], [30, '30 days'], [60, '60 days']];

/* knowledge sources */
export const SOURCE_TYPES = {
  youtube: { label: 'YouTube', group: 'youtube' },
  pdf: { label: 'PDF', group: 'document' },
  docx: { label: 'DOCX', group: 'document' },
  txt: { label: 'TXT', group: 'text' },
  markdown: { label: 'Markdown', group: 'text' },
  business_knowledge: { label: 'Business knowledge', group: 'text' },
  client_conversation: { label: 'Client conversation', group: 'conversation' }
};
export const sourceTypeLabel = t => (t && SOURCE_TYPES[t] ? SOURCE_TYPES[t].label : t || 'Unknown type');
export const SOURCE_STATUSES = ['pending', 'processing', 'indexed', 'failed', 'disabled'];
export const SOURCE_GROUPS = { youtube: 'YouTube videos', document: 'Documents', text: 'Text resources', conversation: 'Client conversations' };
export const VISIBILITY = { workspace: 'Available to all users', restricted: 'Restricted to selected users', private: 'Private administrative source' };
export const VISIBILITY_SHORT = { workspace: 'All users', restricted: 'Restricted', private: 'Private (admins)' };
/** Older UI value "all" means the whole workspace. */
export const normalizeVisibility = v => (v === 'all' ? 'workspace' : v || 'workspace');

/* processing */
export const JOB_TYPES = {
  transcript_extraction: 'Transcript extraction',
  document_extraction: 'Document extraction',
  text_normalization: 'Text normalization',
  chunking: 'Chunk generation',
  embedding: 'Embedding generation',
  indexing: 'Knowledge indexing',
  channel_discovery: 'Channel discovery'
};
export const jobTypeLabel = t => JOB_TYPES[t] || t || '—';
export const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed', 'cancelled'];
export const PIPELINE_STEPS = ['Fetch content', 'Extract text', 'Normalize', 'Generate chunks', 'Create embeddings', 'Write to index'];

/* conversations */
export const OUTCOMES = { answered: 'Answered with sources', insufficient_evidence: 'No supporting evidence', out_of_scope: 'Out of scope', error: 'Error' };
export const REVIEW_STATUSES = { unreviewed: 'Not reviewed', reviewed: 'Reviewed', needs_attention: 'Needs attention', unsupported: 'Unsupported answer', source_mismatch: 'Source mismatch' };
export const FLAGGED_REVIEW = ['needs_attention', 'unsupported', 'source_mismatch'];

/* audit */
export const AUDIT_ACTIONS = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.login_failed': 'Failed sign-in attempt',
  'auth.password_reset_requested': 'Password reset requested',
  'auth.password_reset': 'Password reset',
  'profile.updated': 'Profile updated',
  'invitation.created': 'Invitation created',
  'invitation.resent': 'Invitation resent',
  'invitation.revoked': 'Invitation revoked',
  'invitation.accepted': 'Invitation accepted',
  'user.updated': 'User updated',
  'user.role_changed': 'User role changed',
  'user.suspended': 'User suspended',
  'user.reactivated': 'User reactivated',
  'user.revoked': 'User access revoked',
  'user.deleted': 'User deleted',
  'user.business_profile_updated': 'Business profile edited',
  'user.business_profile_refreshed': 'Business profile refreshed',
  'user.business_profile_released': 'Business profile fields released to AI',
  'user.business_profile_cleared': 'Business profile cleared',
  'source.added': 'Source added',
  'source.updated': 'Source updated',
  'source.disabled': 'Source disabled',
  'source.enabled': 'Source re-enabled',
  'source.deleted': 'Source deleted',
  'job.started': 'Processing started',
  'job.retried': 'Processing retried',
  'job.cancelled': 'Processing cancelled',
  'job.completed': 'Processing completed',
  'job.failed': 'Processing failed',
  'conversation.viewed': 'Conversation viewed',
  'conversation.reviewed': 'Conversation reviewed',
  'conversation.note_added': 'Review note added',
  'conversation.deleted_all': 'Conversations deleted',
  'settings.updated': 'Settings updated',
  'settings.reset': 'Settings reset'
};
export const ENTITY_TYPES = ['auth', 'user', 'invitation', 'source', 'job', 'conversation', 'settings'];

/* analytics */
export const DATE_RANGES = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days']];

/* profile options */
export const TIMEZONES = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney'];
export const LANGUAGES = ['English', 'Arabic', 'French', 'German', 'Spanish', 'Urdu'];
/** Option list that always contains the current value (so a server value outside the list still shows). */
export const withCurrent = (list, current) => (current && !list.includes(current) ? [current, ...list] : list);
