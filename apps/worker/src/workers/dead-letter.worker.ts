import type { Job } from 'bullmq';
import type { DeadLetterJob } from '@mailflow/queue';

import { logger } from '../logger';
import { captureError } from '../observability';

/**
 * Terminal sink for jobs that exhausted their retries. We don't try to recover
 * them automatically — the point is durable visibility (logs + Sentry) so an
 * operator can investigate. Failed jobs themselves are retained by BullMQ
 * (`removeOnFail` age) for inspection.
 */
export async function processDeadLetter(job: Job<DeadLetterJob>): Promise<void> {
  const { queue, jobId, name, failedReason, attemptsMade } = job.data;
  logger.error(
    {
      deadLetter: true,
      originQueue: queue,
      originJobId: jobId,
      originName: name,
      attemptsMade,
      failedReason,
    },
    'job permanently failed — dead-lettered',
  );
  captureError(
    new Error(`dead-letter: ${queue} job ${jobId ?? '?'} failed: ${failedReason ?? 'unknown'}`),
    {
      originQueue: queue,
      originJobId: jobId,
      attemptsMade,
    },
  );
}
