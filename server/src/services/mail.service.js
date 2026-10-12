/**
 * Outgoing email (SMTP via nodemailer): invitations, password resets and platform notices.
 * - Disabled unless MAIL_ENABLED=true (the automated tests never send mail).
 * - Recipients on reserved test domains (MAIL_SKIP_DOMAINS) are never emailed.
 * - Never throws to callers: returns { sent, skipped?, error? } so a mail outage cannot break a user flow.
 * - Message bodies and credentials are never logged; only recipient domain, category and outcome.
 */
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true, maxConnections: 2, maxMessages: 50,
      connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 30000
    });
  }
  return transporter;
}

export const mailEnabled = () => env.MAIL_ENABLED && !!env.SMTP_USER && !!env.SMTP_PASS;
const fromAddress = () => ({ name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_EMAIL || env.SMTP_USER });
const skipDomains = () => env.MAIL_SKIP_DOMAINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const domainOf = to => String(to).split('@')[1]?.toLowerCase() || '';
const isSkipped = to => { const d = domainOf(to); return skipDomains().some(s => d === s || d.endsWith(`.${s}`)); };

/** { to, subject, html, text, category } → { sent: boolean, skipped?: string, error?: string, messageId? } */
export async function sendMail({ to, subject, html, text, category = 'general', replyTo }) {
  if (!mailEnabled()) return { sent: false, skipped: 'disabled' };
  if (!to || isSkipped(to)) return { sent: false, skipped: 'test_recipient' };
  try {
    const info = await getTransport().sendMail({
      from: fromAddress(), to, subject, html, text, replyTo: replyTo || env.MAIL_REPLY_TO || undefined,
      headers: { 'X-NexusAI-Category': category }
    });
    logger.info({ category, domain: domainOf(to), accepted: info.accepted?.length || 0 }, 'email sent');
    return { sent: (info.accepted?.length || 0) > 0, messageId: info.messageId };
  } catch (e) {
    logger.warn({ category, domain: domainOf(to), code: e.code, responseCode: e.responseCode }, 'email failed');
    return { sent: false, error: e.responseCode === 535 || e.code === 'EAUTH' ? 'The mail server rejected the login.' : 'The email could not be sent.' };
  }
}

/** Check SMTP login (used by verify-config and the mail test script). */
export async function verifyMail() {
  if (!mailEnabled()) return { ok: false, reason: 'disabled' };
  try { await getTransport().verify(); return { ok: true }; }
  catch (e) { return { ok: false, reason: e.code === 'EAUTH' ? 'login rejected (check SMTP_USER / SMTP_PASS)' : (e.code || 'connection failed') }; }
}

export function closeMail() { transporter?.close(); transporter = null; }

/* ------------------------------------------------------------------ templates */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Branded, email-client-safe layout (tables + inline styles). Content values are escaped here.
 * blocks: [{ p: text } | { button: { url, label } } | { note: text } | { quote: text } | { link: url }]
 */
export function layout({ preheader = '', heading, blocks = [], brand = env.MAIL_FROM_NAME }) {
  const body = blocks.map(b => {
    if (b.p) return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#d6d3cc">${esc(b.p)}</p>`;
    if (b.quote) return `<div style="margin:0 0 18px;padding:12px 16px;border-left:3px solid #d4a64a;background:#1b1a17;border-radius:6px;font-size:14px;line-height:1.6;color:#e9e4d8;white-space:pre-line">${esc(b.quote)}</div>`;
    if (b.button) return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td style="border-radius:10px;background:#d4a64a">
      <a href="${esc(b.button.url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#14130f;text-decoration:none;border-radius:10px">${esc(b.button.label)}</a></td></tr></table>`;
    if (b.link) return `<p style="margin:0 0 18px;font-size:12.5px;line-height:1.6;color:#8f8a7f">If the button doesn't work, copy this link into your browser:<br><a href="${esc(b.link)}" style="color:#d4a64a;word-break:break-all">${esc(b.link)}</a></p>`;
    if (b.note) return `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#8f8a7f">${esc(b.note)}</p>`;
    return '';
  }).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#0e0d0b;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0d0b;padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 18px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:34px;height:34px;border-radius:9px;background:#d4a64a;text-align:center;font-weight:800;font-size:18px;color:#14130f">N</td>
      <td style="padding-left:10px;font-size:16px;font-weight:700;letter-spacing:.06em;color:#f2eee4">${esc(brand.toUpperCase())}</td></tr></table></td></tr>
    <tr><td style="background:#161512;border:1px solid #2a2823;border-radius:16px;padding:32px 30px">
      <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#f6f2e8;font-weight:700">${esc(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 6px 0;font-size:12px;line-height:1.6;color:#6f6b62;text-align:center">
      You received this email from ${esc(brand)}. If you weren't expecting it, you can safely ignore it.</td></tr>
  </table></td></tr></table></body></html>`;
}

const textOf = (heading, lines) => [heading, '', ...lines.filter(Boolean)].join('\n');

export function invitationEmail({ inviterName, role, url, expiresAt, message, workspace = env.MAIL_FROM_NAME }) {
  const who = inviterName ? `${inviterName} has invited you` : 'You have been invited';
  const roleLabel = { admin: 'an administrator', member: 'a member', readonly: 'a read-only member' }[role] || 'a member';
  const subject = `You're invited to ${workspace}`;
  const intro = `${who} to join ${workspace} as ${roleLabel}. ${workspace} lets you ask questions and get answers grounded in your team's videos and documents, with sources for every answer.`;
  const expiry = `This invitation is personal to you and expires on ${fmtDate(expiresAt)}.`;
  return {
    subject,
    html: layout({ preheader: `${who} to join ${workspace}.`, heading: subject, blocks: [
      { p: intro }, ...(message ? [{ quote: message }] : []), { button: { url, label: 'Accept invitation' } }, { note: expiry }, { link: url }
    ] }),
    text: textOf(subject, [intro, message ? `Message: ${message}` : '', `Accept the invitation: ${url}`, expiry])
  };
}

export function passwordResetEmail({ url, name, workspace = env.MAIL_FROM_NAME, expiresInMinutes = 60 }) {
  const subject = `Reset your ${workspace} password`;
  const intro = `${name ? `Hi ${name}, w` : 'W'}e received a request to reset the password for your ${workspace} account. Choose a new password using the button below.`;
  const note = `The link works once and expires in about ${expiresInMinutes} minutes. If you didn't ask for a reset, ignore this email: your password stays the same.`;
  return {
    subject,
    html: layout({ preheader: 'Use this link to choose a new password.', heading: subject, blocks: [{ p: intro }, { button: { url, label: 'Reset password' } }, { note }, { link: url }] }),
    text: textOf(subject, [intro, `Reset your password: ${url}`, note])
  };
}

export function welcomeEmail({ name, url, workspace = env.MAIL_FROM_NAME }) {
  const subject = `Welcome to ${workspace}`;
  const intro = `${name ? `Hi ${name}, y` : 'Y'}our account is ready. Ask a question in plain language and every answer comes with links to the exact video moment or document page it came from.`;
  return {
    subject,
    html: layout({ preheader: 'Your account is ready.', heading: subject, blocks: [{ p: intro }, { button: { url, label: `Open ${workspace}` } }] }),
    text: textOf(subject, [intro, url])
  };
}

/** Generic platform notice ("send info"): { title, paragraphs[], cta?: { url, label } }. */
export function noticeEmail({ title, paragraphs = [], cta }) {
  return {
    subject: title,
    html: layout({ preheader: paragraphs[0] || title, heading: title, blocks: [...paragraphs.map(p => ({ p })), ...(cta ? [{ button: cta }, { link: cta.url }] : [])] }),
    text: textOf(title, [...paragraphs, cta ? `${cta.label}: ${cta.url}` : ''])
  };
}
