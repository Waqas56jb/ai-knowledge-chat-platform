/* Static UI configuration only: brand copy, labels and option lists. No user or workspace data lives here. */
export const BRAND = { name: 'NEXUS AI', short: 'NEXUS', tagline: 'Answers grounded in what you actually know.' };

/* Source scopes accepted by POST /chat and the group filter of GET /sources. */
export const SCOPES = [['all', 'All sources'], ['youtube', 'YouTube'], ['document', 'Documents'], ['text', 'Text'], ['conversation', 'Conversations']];

/* Display metadata for the four source groups the API reports (Source.group). */
export const TYPES = {
  youtube: { label: 'YouTube', plural: 'YouTube videos', icon: 'play-circle' },
  document: { label: 'Document', plural: 'Documents', icon: 'file-text' },
  text: { label: 'Text', plural: 'Text resources', icon: 'align-left' },
  conversation: { label: 'Conversation', plural: 'Client conversations', icon: 'messages-square' }
};
/* Source.type → group, mirroring the server's mapping (used for citations, which carry only the type). */
export const TYPE_GROUP = { youtube: 'youtube', pdf: 'document', docx: 'document', txt: 'text', markdown: 'text', business_knowledge: 'text', client_conversation: 'conversation' };
export const TYPE_LABEL = { youtube: 'YouTube video', pdf: 'PDF', docx: 'DOCX', txt: 'Text file', markdown: 'Markdown', business_knowledge: 'Business knowledge', client_conversation: 'Client conversation' };
export const groupOf = s => (s && (s.group || TYPE_GROUP[s.type] || TYPE_GROUP[s.sourceType])) || 'text';

export const TZ = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney'];
export const LANGS = ['English', 'Arabic', 'French', 'German', 'Spanish', 'Urdu'];
export const ROLE_LABEL = { admin: 'Admin', member: 'Member', readonly: 'Read-only' };

export const LP_HERO = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=3840&q=90';
