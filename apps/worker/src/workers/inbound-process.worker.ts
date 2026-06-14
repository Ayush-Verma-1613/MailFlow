import type { Job } from 'bullmq';
import { getRawMessage, parseBounce, parseRawEmail } from '@mailflow/email';
import { enqueue, type InboundProcessJob } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';

import { logger } from '../logger';
import { gmailClientOptions, loadAccountWithSecrets } from '../lib/provider';
import { applyBounce, ingestParsedMessage } from '../lib/inbound';

/**
 * Fetch a single inbound message (currently Gmail), parse it, and run it
 * through the reconciliation engine. Enqueues ai-analyze for new replies.
 */
export async function processInboundProcess(job: Job<InboundProcessJob>): Promise<void> {
  const { orgId, accountId, providerMessageId } = job.data;
  const log = logger.child({ worker: 'inbound-process', providerMessageId });

  const account = await loadAccountWithSecrets(accountId);
  if (!account) return;

  let raw: Buffer | null = null;
  if (account.provider === 'gmail') {
    raw = await getRawMessage(gmailClientOptions(account), providerMessageId);
  }
  if (!raw) {
    log.warn('no raw message available');
    return;
  }

  // Asynchronous bounces (DSNs) arrive here as mailer-daemon reports. Handle
  // them as suppression signals rather than threading/AI-analyzing them.
  const bounce = await parseBounce(raw);
  if (bounce) {
    if (bounce.permanent) {
      const suppressed = await applyBounce(orgId, bounce);
      log.info(
        { recipients: bounce.recipients, status: bounce.status, suppressed },
        'processed hard bounce (DSN)',
      );
    } else {
      log.info(
        { recipients: bounce.recipients, status: bounce.status },
        'transient bounce — ignored',
      );
    }
    return;
  }

  const parsed = await parseRawEmail(raw);
  const result = await ingestParsedMessage({ orgId, accountId, parsed });

  if (result.deduped) {
    log.debug('duplicate message — skipped');
    return;
  }

  // Hand off to the AI analyzer (Phase 6).
  if (result.messageDbId) {
    await enqueue(
      QUEUE_NAMES.aiAnalyze,
      { orgId, messageId: result.messageDbId },
      { jobId: `ai-${result.messageDbId}` },
    );
  }
  log.info({ threadId: result.threadId, isReply: result.isReply }, 'processed inbound');
}
