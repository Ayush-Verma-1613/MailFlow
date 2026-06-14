import type { Job } from 'bullmq';
import { EmailAccount } from '@mailflow/db';
import { registerGmailWatch } from '@mailflow/email';
import { env } from '@mailflow/shared/env';

import { logger } from '../logger';
import { gmailClientOptions, loadAccountWithSecrets } from '../lib/provider';
import { runNoReplyScan } from '../lib/no-reply';

/** Renew Gmail watches within this window of expiry (Gmail watches last ~7d). */
const WATCH_RENEW_BEFORE_MS = 24 * 60 * 60_000;

/**
 * Periodic maintenance (repeatable job): reset per-account daily counters at the
 * UTC day boundary, renew expiring Gmail push watches, and emit `no_reply_after`
 * workflow events.
 */
export async function processAccountHealth(_job: Job): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Reset daily counters once per UTC day.
  const reset = await EmailAccount.updateMany(
    {
      $or: [{ 'health.resetAt': { $lt: startOfDay } }, { 'health.resetAt': { $exists: false } }],
    },
    { $set: { 'health.sentToday': 0, 'health.bouncesToday': 0, 'health.resetAt': new Date() } },
  );
  if (reset.modifiedCount > 0) {
    logger.info({ accounts: reset.modifiedCount }, 'reset daily send counters');
  }

  await renewExpiringGmailWatches();
  await runNoReplyScan();
}

/**
 * A Gmail push watch expires after ~7 days; if it lapses, inbound mail silently
 * stops flowing. Re-register watches that are missing or nearing expiry. Each
 * successful renewal pushes `watchExpiration` ~7 days out, so a given account
 * is only renewed once per window even though this job runs every few minutes.
 */
async function renewExpiringGmailWatches(): Promise<void> {
  if (!env.GMAIL_PUBSUB_TOPIC) return;

  const cutoff = new Date(Date.now() + WATCH_RENEW_BEFORE_MS);
  const due = await EmailAccount.find({
    provider: 'gmail',
    $or: [{ watchExpiration: { $lt: cutoff } }, { watchExpiration: { $exists: false } }],
  })
    .select('_id')
    .lean();
  if (due.length === 0) return;

  let renewed = 0;
  for (const { _id } of due) {
    try {
      const account = await loadAccountWithSecrets(_id.toString());
      if (!account) continue;
      const result = await registerGmailWatch(gmailClientOptions(account), env.GMAIL_PUBSUB_TOPIC);
      const update: Record<string, unknown> = {};
      if (result.expiration) update.watchExpiration = result.expiration;
      // Only seed historyId if we don't have one yet — never rewind the watermark.
      if (result.historyId && !account.historyId) update.historyId = result.historyId;
      if (Object.keys(update).length > 0) {
        await EmailAccount.updateOne({ _id }, { $set: update });
      }
      renewed++;
    } catch (err) {
      logger.error(
        { accountId: String(_id), err: err instanceof Error ? err.message : err },
        'gmail watch renewal failed',
      );
    }
  }
  if (renewed > 0) logger.info({ accounts: renewed }, 'renewed gmail watches');
}
