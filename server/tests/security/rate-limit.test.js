/** Rate limiting (limits are normally skipped in tests; this file enables them before the app loads). */
import { describe, it, expect, afterAll } from 'vitest';

process.env.TEST_RATE_LIMITS = '1';
const { api, P } = await import('../helpers/setup.js');
const { pool } = await import('../../src/config/database.js');

afterAll(async () => { await pool.end(); });

describe('rate limits', () => {
  it('invitation validation is rate limited per IP (brute-force protection)', async () => {
    const statuses = [];
    for (let i = 0; i < 24; i++) statuses.push((await api().post(`${P}/auth/validate-invitation`).send({ token: `nxs_${'a'.repeat(30)}${i}` })).status);
    expect(statuses).toContain(400);
    expect(statuses[statuses.length - 1]).toBe(429);
    const last = await api().post(`${P}/auth/validate-invitation`).send({ token: `nxs_${'b'.repeat(30)}` });
    expect(last.body.error.code).toBe('RATE_LIMITED');
  });
});
