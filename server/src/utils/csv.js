/**
 * RFC 4180 CSV with formula-injection protection: cells starting with = + - @ (or tab/CR)
 * are prefixed with an apostrophe so spreadsheet apps do not execute them.
 */
const cell = v => {
  if (v == null) return '';
  let s = Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** columns: [{ key, label, value?: row => any }] */
export function toCsv(rows, columns) {
  return [columns.map(c => cell(c.label)).join(','), ...rows.map(r => columns.map(c => cell(c.value ? c.value(r) : r[c.key])).join(','))].join('\r\n');
}

export function sendCsv(res, name, rows, columns) {
  const filename = `dts-ai-${name}-${new Date().toISOString().slice(0, 10)}.csv`.replace(/[^a-z0-9._-]/gi, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + toCsv(rows, columns));
}
