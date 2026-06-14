import { DEFAULT_JOB_OPTS } from '@mailflow/shared';

/**
 * Has this job used up all of its retry attempts? BullMQ emits `failed` on
 * every attempt, so callers use this to route only *permanently* failed jobs to
 * the dead-letter queue. Pure (no logger/env imports) so it's unit-testable.
 */
export function isExhausted(job: { attemptsMade: number; opts?: { attempts?: number } }): boolean {
  const max = job.opts?.attempts ?? DEFAULT_JOB_OPTS.attempts;
  return job.attemptsMade >= max;
}
