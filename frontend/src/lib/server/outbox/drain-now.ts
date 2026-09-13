// Best-effort IMMEDIATE outbox drain — called right after enqueueOutbox()
// for latency-sensitive emails (signup verification, password reset, admin
// invitation) so the recipient doesn't have to wait for the scheduled
// outbox-drain/email-queue-drain crons, which on this project's Vercel plan
// only run once a day (see vercel.json — Hobby plan caps cron frequency at
// daily) rather than the "every 1 minute" this codebase was originally
// designed around. Without this, an invited admin or a password-reset
// requester could wait up to 24h for their e-mail.
//
// Reuses drainOutbox() (PROTECTED — src/lib/server/outbox/dispatcher.ts)
// exactly as the outbox-drain cron route already does, plus the same
// EmailQueue.drainOne() loop the email-queue-drain cron route already
// does — no protected invariants are touched, this only calls existing
// public functions. Small batch size (a handful, not the cron's 100) so a
// user-facing request never blocks on draining a large backlog; the daily
// cron remains the guaranteed catch-all for anything this misses.
//
// Never throws: on any failure the OutboxEvent/EmailJob rows stay PENDING
// and the daily cron is still the fallback — a slow/failed immediate drain
// must never break the signup/reset/invite request itself.
import 'server-only';
import { prisma } from '../prisma';
import { drainOutbox } from './dispatcher';
import { getEmailQueue } from '../queues/email-queue-singleton';
import { createLogger } from '../logger';

const log = createLogger();
const IMMEDIATE_BATCH_SIZE = 5;

export async function drainOutboxNow(): Promise<void> {
  try {
    const queue = getEmailQueue();
    await drainOutbox({ prisma, ...(queue ? { emailQueue: queue } : {}) }, IMMEDIATE_BATCH_SIZE);
    if (queue) {
      for (let i = 0; i < IMMEDIATE_BATCH_SIZE; i++) {
        const handled = await queue.drainOne();
        if (!handled) break; // queue empty
      }
    }
  } catch (err) {
    log.warn('drainOutboxNow failed (daily cron remains the fallback)', { err: String(err) });
  }
}
