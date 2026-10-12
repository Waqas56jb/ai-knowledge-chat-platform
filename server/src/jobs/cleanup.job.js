/** Periodic housekeeping (runs from the worker's maintenance timer). Only touches this app's tables. */
import { query } from '../config/database.js';
import { T } from '../config/constants.js';
import { pruneOrphanGaps } from '../services/contentGap.service.js';

let lastRun = 0;

export async function runCleanup() {
  if (Date.now() - lastRun < 6 * 3600 * 1000) return; // at most every 6 hours
  lastRun = Date.now();
  // read notifications older than 90 days
  await query(`delete from ${T.notifications} where read_at is not null and read_at < now() - interval '90 days'`);
  // usage events are only needed for quotas/cost reporting: keep one year
  await query(`delete from ${T.usage} where created_at < now() - interval '365 days'`);
  // triage rows for unanswered questions whose conversations were all deleted
  await pruneOrphanGaps();
}
