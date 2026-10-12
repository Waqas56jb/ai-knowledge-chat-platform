/**
 * Send a test email to check the SMTP setup (credentials are never printed).
 *   npm run mail:test -- --to you@example.com [--type notice|invitation|reset|welcome]
 * "invitation" and "reset" previews use a placeholder link that does NOT grant access.
 */
import { env } from '../src/config/env.js';
import { mailEnabled, verifyMail, sendMail, closeMail, noticeEmail, invitationEmail, passwordResetEmail, welcomeEmail } from '../src/services/mail.service.js';

const args = process.argv.slice(2);
const arg = name => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const to = arg('to');
const type = arg('type') || 'notice';

if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { console.error('Usage: npm run mail:test -- --to you@example.com [--type notice|invitation|reset|welcome]'); process.exit(1); }
if (!mailEnabled()) { console.error('Outgoing email is disabled. Set MAIL_ENABLED=true, SMTP_USER and SMTP_PASS in server/.env.'); process.exit(1); }

const preview = `${env.CLIENT_URL}/?email-preview`;
const templates = {
  notice: () => noticeEmail({ title: `${env.MAIL_FROM_NAME} email is working`, paragraphs: ['This is a test message from the DTS AI server. Outgoing email (invitations, password resets and notices) is configured correctly.'], cta: { url: env.CLIENT_URL, label: `Open ${env.MAIL_FROM_NAME}` } }),
  invitation: () => invitationEmail({ inviterName: 'DTS AI Admin', role: 'member', url: preview, expiresAt: new Date(Date.now() + 7 * 864e5), message: 'Preview of the invitation email (this link does not grant access).' }),
  reset: () => passwordResetEmail({ url: preview, name: 'there' }),
  welcome: () => welcomeEmail({ name: 'there', url: `${env.CLIENT_URL}/app` })
};
if (!templates[type]) { console.error(`Unknown --type ${type}. Use one of: ${Object.keys(templates).join(', ')}`); process.exit(1); }

const v = await verifyMail();
console.log(v.ok ? `✓ SMTP login OK (${env.SMTP_HOST}:${env.SMTP_PORT})` : `✗ SMTP: ${v.reason}`);
if (v.ok) {
  const r = await sendMail({ to, ...templates[type](), category: `test_${type}` });
  console.log(r.sent ? `✓ "${type}" email sent to ${to}` : `✗ not sent: ${r.error || r.skipped}`);
  if (!r.sent) process.exitCode = 1;
} else process.exitCode = 1;
closeMail();
