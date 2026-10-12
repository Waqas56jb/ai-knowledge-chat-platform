/**
 * Client-side CSV export. Files are generated in the browser and downloaded directly;
 * nothing is stored on a server.
 *
 * columns: [{ key, label, value?: row => any }]
 */
const escapeCell = v => {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows, columns) {
  const head = columns.map(c => escapeCell(c.label)).join(',');
  const body = rows.map(r => columns.map(c => escapeCell(c.value ? c.value(r) : r[c.key])).join(','));
  return [head, ...body].join('\r\n');
}

/** Descriptive filename: nexus-admin-users-2026-10-12.csv */
export const csvFilename = name => `nexus-admin-${name}-${new Date().toISOString().slice(0, 10)}.csv`;

export function downloadFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' + content : content], { type }); // BOM so Excel reads UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(name, rows, columns) {
  downloadFile(csvFilename(name), toCsv(rows, columns));
  return rows.length;
}
