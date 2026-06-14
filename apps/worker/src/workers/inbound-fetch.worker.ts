import type { Job } from 'bullmq';
import { EmailAccount } from '@mailflow/db';
import { fetchHistory } from '@mailflow/email';
import { enqueue, type InboundFetchJob } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';

import { logger } from '../logger';
import { gmailClientOptions, loadAccountWithSecrets } from '../lib/provider';

/**
 * Pull newly-added Gmail message ids since the stored history watermark and
 * enqueue an inbound-process job per message. Advances the watermark.
 */
export async function processInboundFetch(job: Job<InboundFetchJob>): Promise<void> {
  const { orgId, accountId } = job.data;
  const log = logger.child({ worker: 'inbound-fetch', accountId });

  const account = await loadAccountWithSecrets(accountId);
  if (!account || account.provider !== 'gmail') return;

  const startHistoryId = job.data.historyId ?? account.historyId;
  if (!startHistoryId) {
    log.warn('no history id to fetch from');
    return;
  }

  const { messageIds, historyId } = await fetchHistory(
    gmailClientOptions(account),
    startHistoryId,
  );

  for (const providerMessageId of messageIds) {
    await enqueue(
      QUEUE_NAMES.inboundProcess,
      { orgId, accountId, providerMessageId },
      { jobId: `inbound-${accountId}-${providerMessageId}` },
    );
  }

  if (historyId && historyId !== account.historyId) {
    await EmailAccount.updateOne({ _id: accountId }, { $set: { historyId } });
  }
  log.info({ count: messageIds.length }, 'fetched inbound messages');
}
