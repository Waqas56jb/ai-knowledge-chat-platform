import crypto from 'node:crypto';

/** Remove control characters (except newline/tab) and normalise whitespace in user-provided text. */
export function cleanText(s, { maxLength = 100000, keepNewlines = true } = {}) {
  if (s == null) return '';
  // eslint-disable-next-line no-control-regex -- stripping control characters is intentional
  let out = String(s).normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  out = keepNewlines ? out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n') : out.replace(/\s+/g, ' ');
  return out.trim().slice(0, maxLength);
}

/** Short, safe error text for storing/returning (no stack traces, SQL or secrets). */
export function safeErrorMessage(err, fallback = 'An unexpected error occurred.') {
  if (!err) return fallback;
  if (err.expose && err.message) return err.message.slice(0, 300);
  const msg = String(err.message || '');
  if (/sk-[a-z0-9-_]{10,}|eyJ[a-zA-Z0-9_-]{10,}|postgres(ql)?:\/\//i.test(msg)) return fallback;
  if (err.code && /^[0-9A-Z]{5}$/.test(err.code)) return fallback; // raw Postgres error
  return msg.slice(0, 300) || fallback;
}

/** File-system/storage safe name. */
export const safeFileName = name => String(name || 'file').normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').replace(/^\.+/, '').slice(0, 120) || 'file';

/** Cryptographically secure invitation token + its SHA-256 hash (only the hash is stored). */
export function newToken(prefix = 'nxs') {
  const raw = `${prefix}_${crypto.randomBytes(32).toString('base64url')}`;
  return { raw, hash: hashToken(raw), hint: raw.slice(-4) };
}
export const hashToken = raw => crypto.createHash('sha256').update(String(raw)).digest('hex');
export const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

export const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s));
