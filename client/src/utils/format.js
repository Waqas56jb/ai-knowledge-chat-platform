export const DAY = 864e5;
const valid = iso => iso != null && iso !== '' && !Number.isNaN(new Date(iso).getTime());
/** "Mar 4, 2026" from an ISO timestamp (or YYYY-MM-DD); "" when missing. */
export const fmtDate = iso => (valid(iso) ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
export const fmtDateTime = iso => (valid(iso) ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
export function rel(iso) {
  if (!valid(iso)) return '';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  if (s < 7 * 86400) { const d = Math.floor(s / 86400); return d === 1 ? 'Yesterday' : d + ' days ago'; }
  return fmtDate(iso);
}
/** 754 → "12:34", 3723 → "1:02:03" */
export function fmtDuration(sec) {
  if (sec == null || Number.isNaN(+sec)) return '';
  sec = Math.max(0, Math.round(+sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, p = n => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}
export function fmtSize(bytes) {
  if (bytes == null) return '';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0, n = +bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i ? n.toFixed(1) : n) + ' ' + u[i];
}
/** Local weekday label for a 'YYYY-MM-DD' day key. */
export const weekday = ymd => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' }); };
export const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
export const firstName = u => ((u && (u.fullName || u.email)) || '').split(/[\s@]/)[0];
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
/** Password rules from the API: 8–72 chars, at least one letter and one number. */
export const passwordError = pw => (pw.length < 8 ? 'Use at least 8 characters.' : pw.length > 72 ? 'Use at most 72 characters.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Include at least one letter and one number.' : '');
/** Readable message for an ApiError (or any error). */
export const errMsg = (e, fallback = 'Something went wrong. Please try again.') => (e && e.message) || fallback;
