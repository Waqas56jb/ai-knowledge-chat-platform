import { format, formatDistanceToNowStrict, isValid } from 'date-fns';

const d = v => (v instanceof Date ? v : new Date(v));
const ok = v => v != null && isValid(d(v));

export const formatDate = v => (ok(v) ? format(d(v), 'MMM d, yyyy') : '—');
export const formatDateTime = v => (ok(v) ? format(d(v), 'MMM d, yyyy · HH:mm') : '—');
export const formatTime = v => (ok(v) ? format(d(v), 'HH:mm') : '—');
export const formatInputDate = v => (ok(v) ? format(d(v), 'yyyy-MM-dd') : '');

/** "5 min ago", "in 3 days", or "Never" for empty values. */
export function relativeTime(v, empty = 'Never') {
  if (!ok(v)) return empty;
  const diff = d(v).getTime() - Date.now();
  if (Math.abs(diff) < 45000) return 'Just now';
  const s = formatDistanceToNowStrict(d(v));
  return diff < 0 ? `${s} ago` : `in ${s}`;
}

export const formatNumber = n => (n == null ? '—' : new Intl.NumberFormat().format(n));
export const formatCompact = n => (n == null ? '—' : new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n));
export const formatPercent = (n, digits = 1) => (n == null ? '—' : `${Number(n).toFixed(digits).replace(/\.0+$/, '')}%`);

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i ? 1 : 0)} ${u[i]}`;
}

/** Duration between two timestamps ("1m 05s"), or since `start` when `end` is empty. */
export function formatDuration(start, end) {
  if (!ok(start)) return '—';
  const ms = (ok(end) ? d(end) : new Date()).getTime() - d(start).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

export const initials = name => (name || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const capitalize = s => (s ? s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
export const pluralize = (n, one, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
