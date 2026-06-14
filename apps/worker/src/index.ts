// Must be first: populate process.env from the root .env.
import './load-env';

import { Worker } from 'bullmq';
import { assertEnv } from '@mailflow/shared/env';
import { QUEUE_CONCURRENCY, QUEUE_NAMES } from '@mailflow/shared';
import { connectToDatabase, disconnectFromDatabase } from '@mailflow/db';
import { closeQueues, closeRedis, enqueue, getQueue, getRedis } from '@mailflow/queue';

import { logger } from './logger';
import { captureError, initObservability } from './observability';
import { startHealthServer } from './health';
import { processCampaignFanout } from './workers/campaign-fanout.worker';
import { processSendEmail } from './workers/send-email.worker';
import { processInboundFetch } from './workers/inbound-fetch.worker';
import { processInboundProcess } from './workers/inbound-process.worker';
import { processAiAnalyze } from './workers/ai-analyze.worker';
import { processWorkflowRun } from './workers/workflow-run.worker';
import { processRewardGrant } from './workers/reward-grant.worker';
import { processAccountHealth } from './workers/account-health.worker';
import { processDeadLetter } from './workers/dead-letter.worker';
import { isExhausted } from './lib/retry';

const HEALTH_INTERVAL_MS = 15 * 60 * 1000;

async function main(): Promise<void> {
  assertEnv(); // fail fast on bad config
  initObservability();
  await connectToDatabase();
  logger.info('MongoDB connected');

  const healthServer = startHealthServer();

  const connection = getRedis();

  const workers: Worker[] = [
    new Worker(QUEUE_NAMES.campaignFanout, processCampaignFanout, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.campaignFanout],
    }),
    new Worker(QUEUE_NAMES.sendEmail, processSendEmail, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.sendEmail],
    }),
    new Worker(QUEUE_NAMES.inboundFetch, processInboundFetch, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.inboundFetch],
    }),
    new Worker(QUEUE_NAMES.inboundProcess, processInboundProcess, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.inboundProcess],
    }),
    new Worker(QUEUE_NAMES.aiAnalyze, processAiAnalyze, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.aiAnalyze],
    }),
    new Worker(QUEUE_NAMES.workflowRun, processWorkflowRun, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.workflowRun],
    }),
    new Worker(QUEUE_NAMES.rewardGrant, processRewardGrant, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.rewardGrant],
    }),
    new Worker(QUEUE_NAMES.accountHealth, processAccountHealth, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.accountHealth],
    }),
    new Worker(QUEUE_NAMES.deadLetter, processDeadLetter, {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.deadLetter],
    }),
  ];

  // Schedule periodic maintenance (daily-cap reset + no_reply_after scan).
  // BullMQ delivers each repeat occurrence to a single worker replica.
  await getQueue(QUEUE_NAMES.accountHealth).add(
    'maintenance',
    {},
    { repeat: { every: HEALTH_INTERVAL_MS }, jobId: 'account-health-maintenance' },
  );

  for (const w of workers) {
    w.on('failed', (job, err) => {
      logger.error({ queue: w.name, jobId: job?.id, err: err.message }, 'job failed');
      captureError(err, { queue: w.name, jobId: job?.id });
      // Route permanently-failed jobs (retries exhausted) to the dead-letter
      // queue for ops visibility. Skip the DLQ's own failures to avoid a loop.
      if (w.name !== QUEUE_NAMES.deadLetter && job && isExhausted(job)) {
        void enqueue(QUEUE_NAMES.deadLetter, {
          queue: w.name,
          jobId: job.id,
          name: job.name,
          data: job.data,
          failedReason: err.message,
          attemptsMade: job.attemptsMade,
        }).catch((e) =>
          logger.error(
            { err: e instanceof Error ? e.message : e },
            'failed to enqueue dead-letter',
          ),
        );
      }
    });
    w.on('completed', (job) => logger.debug({ queue: w.name, jobId: job.id }, 'job completed'));
    w.on('error', (err) => logger.error({ queue: w.name, err: err.message }, 'worker error'));
  }

  logger.info(
    { queues: workers.map((w) => w.name) },
    `Worker fleet started (${workers.length} queues)`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    healthServer.close();
    await Promise.allSettled(workers.map((w) => w.close()));
    await closeQueues();
    await closeRedis();
    await disconnectFromDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(err, 'worker failed to start');
  process.exit(1);
});
