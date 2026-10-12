import { describe, it, expect } from 'vitest';
import { sendMail, invitationEmail, passwordResetEmail, noticeEmail, layout } from '../../src/services/mail.service.js';

describe('mail service', () => {
  it('never sends when mail is disabled (tests run with MAIL_ENABLED=false)', async () => {
    expect(await sendMail({ to: 'someone@gmail.com', subject: 's', html: '<p>x</p>', text: 'x' })).toEqual({ sent: false, skipped: 'disabled' });
  });

  it('escapes user-supplied values in templates', () => {
    const m = invitationEmail({ inviterName: '<script>alert(1)</script>', role: 'member', url: 'https://app.example/register?invite=nxs_abc&x="y"', expiresAt: '2030-01-01', message: '<img src=x onerror=alert(1)>' });
    expect(m.html).not.toMatch(/<script>|<img/);
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).toContain('invite=nxs_abc&amp;x=&quot;y&quot;');
    expect(m.text).toContain('https://app.example/register?invite=nxs_abc');
  });

  it('invitation email states the role, link and expiry', () => {
    const m = invitationEmail({ inviterName: 'Ana', role: 'readonly', url: 'https://app.example/register?invite=nxs_1', expiresAt: '2030-01-15T00:00:00Z' });
    expect(m.subject).toMatch(/invited/i);
    expect(m.html).toContain('a read-only member');
    expect(m.html).toContain('https://app.example/register?invite=nxs_1');
    expect(m.text).toMatch(/expires on January 1[45], 2030/);
  });

  it('password reset and notice emails include their call to action', () => {
    const r = passwordResetEmail({ url: 'https://app.example/reset-password?token_hash=abc&type=recovery', name: 'Sam' });
    expect(r.html).toContain('Reset password');
    expect(r.text).toContain('token_hash=abc');
    const n = noticeEmail({ title: 'New videos added', paragraphs: ['Three new videos are searchable.'], cta: { url: 'https://app.example', label: 'Open' } });
    expect(n.subject).toBe('New videos added');
    expect(n.html).toContain('Three new videos are searchable.');
    expect(layout({ heading: 'H', blocks: [{ p: 'a & b' }] })).toContain('a &amp; b');
  });
});
