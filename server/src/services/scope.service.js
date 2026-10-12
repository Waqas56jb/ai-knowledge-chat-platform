/**
 * Domain/scope policy, enforced server-side BEFORE any model call. Deterministic checks catch common
 * prompt-injection, secret-extraction and blocked-topic requests. This reduces risk but is NOT a complete
 * security boundary — grounding, access-controlled retrieval and citation validation still apply.
 */
const INJECTION = [
  /\b(ignore|disregard|forget|override)\b.{0,40}\b(previous|prior|above|earlier|all|any|your|system)\b.{0,30}\b(instructions?|rules?|prompts?|directives?|guidelines?)\b/i,
  /\b(reveal|show|print|repeat|output|tell me|what (is|are))\b.{0,40}\b(system|developer|hidden|initial)\s+(prompt|message|instructions?)\b/i,
  /\byour (system )?(prompt|instructions)\b/i,
  /\b(jailbreak|DAN mode|developer mode|do anything now)\b/i,
  /\b(act|pretend|behave|roleplay)\b.{0,20}\b(as|like)\b.{0,30}\b(unrestricted|unfiltered|no rules|without (any )?restrictions)\b/i
];
const SECRETS = [
  /\b(api[\s_-]?keys?|secret[\s_-]?keys?|service[\s_-]?role( key)?|access[\s_-]?tokens?|refresh[\s_-]?tokens?|openai key|supabase key|admin password|database password|environment variables?|connection strings?|database url)\b/i,
  /(^|\s)\.env\b/i,
  /\b(other (users?|people)'?s?|all users'?|another user'?s?)\b.{0,40}\b(conversations?|messages?|chats?|data|emails?|history)\b/i
];

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** → { allowed: true } | { allowed: false, reason: 'prompt_injection'|'secrets'|'blocked_topic', topic? } */
export function checkScope(question, policy) {
  const q = String(question);
  if (INJECTION.some(r => r.test(q))) return { allowed: false, reason: 'prompt_injection' };
  if (SECRETS.some(r => r.test(q))) return { allowed: false, reason: 'secrets' };
  if (policy?.enforceScope) {
    for (const topic of policy.blockedTopics || []) {
      const words = topic.trim().split(/\s+/).map(escape).join('\\s+');
      if (new RegExp(`\\b${words}\\b`, 'i').test(q)) return { allowed: false, reason: 'blocked_topic', topic };
    }
  }
  return { allowed: true };
}

/** Wrap retrieved text so the model treats it as data; neutralise attempts to close the wrapper. */
export const fenceEvidence = text => String(text).replace(/<\/?evidence[^>]*>/gi, '[tag removed]');
