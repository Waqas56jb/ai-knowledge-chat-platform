import { z } from 'zod';
import { Youtube, FileText, AlignLeft, MessagesSquare } from 'lucide-react';
import { requiredText } from '../../../utils/validation';
import { FILE_TYPES, defaultShowCitations, fileExt, parseYouTubeUrl } from '../sourceUtils';

export const STEPS = [
  { id: 'type', label: 'Source type' },
  { id: 'details', label: 'Information' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'review', label: 'Review' }
];

/** Wizard source kinds and the server source types they can produce. */
export const KINDS = {
  youtube: { label: 'YouTube video or channel', description: 'Index the transcript of a public video, or every video of a channel.', icon: Youtube, types: ['youtube'] },
  document: { label: 'Document', description: 'Upload a PDF, DOCX, TXT or Markdown file.', icon: FileText, types: ['pdf', 'docx', 'txt', 'markdown'] },
  text: { label: 'Text content', description: 'Paste or write policies, FAQs and business knowledge.', icon: AlignLeft, types: ['business_knowledge', 'txt', 'markdown'] },
  conversation: { label: 'Client conversation', description: 'Paste call notes or email threads, or upload chat exports (e.g. WhatsApp .txt). Anonymised into reusable lessons.', icon: MessagesSquare, types: ['client_conversation'] }
};

export const CONVERSATION_CATEGORIES = ['Negotiation', 'Support', 'Onboarding', 'Scope change', 'Other'];
export const EXT_LABEL = { pdf: '.pdf', docx: '.docx', txt: '.txt', markdown: '.md' };
/** Most files one client-conversation upload may contain (each file becomes its own source). */
export const MAX_CONVERSATION_FILES = 20;

/** "whatsapp_chat-with-acme.txt" → "whatsapp chat with acme" */
export const titleFromName = name => String(name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Source title for each uploaded conversation file. The title is indexed with the anonymised lessons and is not
 * anonymised itself, and chat exports are usually named after the client ("WhatsApp Chat with Jane Doe.txt"),
 * so file names are never used: without an entered title it is "Client conversation · <context> · <date>".
 * Several files get " (2 of 5)" so each source stays distinguishable.
 */
export function conversationFileTitle(f, file, now = new Date()) {
  const n = f.conversationFiles.length;
  const i = Math.max(0, f.conversationFiles.indexOf(file));
  const base = f.title.trim() || ['Client conversation', f.category && f.category !== 'Other' ? f.category : null, now.toISOString().slice(0, 10)].filter(Boolean).join(' · ');
  return (n > 1 ? `${base} (${i + 1} of ${n})` : base).slice(0, 300);
}

/** Problem with one conversation file, or '' when it can be uploaded. */
export function conversationFileError(file, maxFileSizeMb) {
  if (!FILE_TYPES[fileExt(file.name)]) return `“${file.name}” is not a supported file type. Use .pdf, .docx, .txt or .md.`;
  if (!file.size) return `“${file.name}” is empty.`;
  if (file.size > maxFileSizeMb * 1024 * 1024) return `“${file.name}” is larger than the ${maxFileSizeMb} MB limit.`;
  return '';
}

export const initialForm = defaultVisibility => ({
  kind: null,
  title: '', description: '', tags: [],
  youtubeUrl: '', transcript: '', maxVideos: 50,
  file: null,
  text: '', textType: 'business_knowledge',
  conversationMode: 'paste', conversationText: '', conversationFiles: [], category: '',
  visibility: defaultVisibility === 'all' ? 'workspace' : defaultVisibility || 'workspace', allowedUserIds: [],
  // "Show source to users": null = the default for the chosen type (on for YouTube, off for everything else)
  showCitations: null
});

export const isDirty = f => !!(f.kind || f.title || f.description || f.tags.length || f.youtubeUrl || f.transcript || f.file || f.text || f.conversationText || f.conversationFiles.length);

const meta = { title: requiredText('Title', 300), description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.') };
const MAX_TEXT = 2000000;
const schemas = {
  youtube: z.object({
    title: z.string().trim().max(300, 'Title must be 300 characters or fewer.'),
    description: meta.description,
    youtubeUrl: z.string().trim().min(1, 'Enter a YouTube video or channel URL.').refine(v => !!parseYouTubeUrl(v), 'Use a youtube.com/watch?v=…, youtu.be/…, /shorts/…, @handle or /channel/… URL.'),
    transcript: z.string().max(MAX_TEXT, 'The transcript is too long.'),
    maxVideos: z.coerce.number({ invalid_type_error: 'Enter a number.' }).int('Enter a whole number.').min(1, 'Index at least 1 video.').max(500, 'At most 500 videos per channel.')
  }),
  document: z.object({ ...meta }),
  text: z.object({ ...meta, text: z.string().trim().min(20, 'Enter at least 20 characters of content.').max(MAX_TEXT, 'Content is too long.') }),
  conversation: z.object({ ...meta, conversationText: z.string().trim().min(20, 'Paste at least 20 characters of the conversation.').max(MAX_TEXT, 'Conversation is too long.'), category: z.string().min(1, 'Choose a context.') }),
  // uploaded files: the title is optional (each file's name is used), the files are checked separately
  conversationFiles: z.object({ title: z.string().trim().max(300, 'Title must be 300 characters or fewer.'), description: meta.description, category: z.string().min(1, 'Choose a context.') })
};

const schemaFor = f => (f.kind === 'conversation' && f.conversationMode === 'files' ? schemas.conversationFiles : schemas[f.kind]);

/** Validate one step; returns an errors object ({} when valid). */
export function validateStep(stepId, f, { maxFileSizeMb, supportedTypes }) {
  const errors = {};
  if (stepId === 'type') { if (!f.kind) errors.kind = 'Choose a source type to continue.'; return errors; }
  if (stepId === 'details') {
    const r = schemaFor(f).safeParse(f);
    if (!r.success) r.error.issues.forEach(i => { if (!errors[i.path[0]]) errors[i.path[0]] = i.message; });
    if (f.kind === 'document') {
      if (!f.file) errors.file = 'Choose a file to upload.';
      else {
        const t = FILE_TYPES[fileExt(f.file.name)];
        if (!t || !supportedTypes.includes(t)) errors.file = 'This file type is not supported.';
        else if (f.file.size > maxFileSizeMb * 1024 * 1024) errors.file = `The file is larger than the ${maxFileSizeMb} MB limit.`;
        else if (!f.file.size) errors.file = 'The file is empty.';
      }
    }
    if (f.kind === 'conversation' && f.conversationMode === 'files') {
      if (!f.conversationFiles.length) errors.conversationFiles = 'Choose at least one file to upload.';
      else if (f.conversationFiles.length > MAX_CONVERSATION_FILES) errors.conversationFiles = `Upload at most ${MAX_CONVERSATION_FILES} files at a time.`;
      else {
        const bad = f.conversationFiles.map(file => conversationFileError(file, maxFileSizeMb)).find(Boolean);
        if (bad) errors.conversationFiles = bad;
      }
    }
    return errors;
  }
  if (stepId === 'visibility') {
    if (f.visibility === 'restricted' && !f.allowedUserIds.length) errors.allowedUserIds = 'Choose at least one user, or pick a different visibility.';
    return errors;
  }
  return errors;
}

/** The knowledge source type the wizard will create. */
export function resolveType(f) {
  if (f.kind === 'youtube') return 'youtube';
  if (f.kind === 'document') return f.file ? FILE_TYPES[fileExt(f.file.name)] || 'txt' : null;
  if (f.kind === 'text') return f.textType;
  if (f.kind === 'conversation') return 'client_conversation';
  return null;
}

/** Whether the new source will be shown to users as a cited source. */
export const showCitationsFor = f => (typeof f.showCitations === 'boolean' ? f.showCitations : defaultShowCitations(resolveType(f)));

/** Final tags (the conversation context is saved as a tag). */
export function finalTags(f) {
  const tags = [...f.tags];
  if (f.kind === 'conversation' && f.category && f.category !== 'Other') {
    const t = f.category.toLowerCase();
    if (!tags.some(x => x.toLowerCase() === t)) tags.unshift(t);
  }
  return tags.slice(0, 20);
}

/** Build the createKnowledgeSource payload (see services/knowledgeService). */
export function toPayload(f) {
  const base = {
    title: f.title.trim(), description: f.description.trim(), tags: finalTags(f),
    visibility: f.visibility, allowedUserIds: f.visibility === 'restricted' ? f.allowedUserIds : [],
    hideCitations: !showCitationsFor(f)
  };
  if (f.kind === 'youtube') {
    const channel = parseYouTubeUrl(f.youtubeUrl)?.kind === 'channel';
    return { ...base, kind: 'youtube', url: f.youtubeUrl.trim(), transcript: channel ? '' : f.transcript, maxVideos: channel ? Number(f.maxVideos) : undefined };
  }
  if (f.kind === 'document') return { ...base, kind: 'document', file: f.file };
  if (f.kind === 'text') return { ...base, kind: 'text', sourceType: f.textType, text: f.text.trim() };
  if (f.kind === 'conversation' && f.conversationMode === 'files') return { ...base, kind: 'conversationFiles', files: f.conversationFiles, category: f.category };
  return { ...base, kind: 'text', sourceType: 'client_conversation', text: f.conversationText.trim(), category: f.category };
}

export const wordCount = s => (String(s).trim() ? String(s).trim().split(/\s+/).length : 0);
