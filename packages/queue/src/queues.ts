/**
 * Lazily-instantiated BullMQ queues, one per QueueName, sharing the Redis
 * connection. Producers (web) call `enqueue`; the worker attaches Workers.
 */
import { Queue, type JobsOptions } from 'bullmq';
import { DEFAULT_JOB_OPTS, QUEUE_NAMES, type QueueName } from '@mailflow/shared';

import { getRedis } from './connection';
import type { JobDataFor } from './jobs';

const queues = new Map<QueueName, Queue>();

export function getQueue<Q extends QueueName>(name: Q): Queue<JobDataFor<Q>> {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: DEFAULT_JOB_OPTS,
    });
    queues.set(name, queue);
  }
  return queue as Queue<JobDataFor<Q>>;
}

/** Add a typed job to a queue. */
export function enqueue<Q extends QueueName>(
  name: Q,
  data: JobDataFor<Q>,
  opts?: JobsOptions,
): Promise<unknown> {
  // Cast to the base Queue: BullMQ's `add` name-type generic is stricter than
  // our keyed map needs, but the public signature above keeps callers typed.
  return (getQueue(name) as Queue).add(name, data, opts);
}

/**
 * Add many typed jobs to a queue in one round-trip (BullMQ `addBulk`). Used by
 * campaign fanout so enqueuing N recipients isn't N sequential Redis calls.
 */
export function enqueueBulk<Q extends QueueName>(
  name: Q,
  jobs: { data: JobDataFor<Q>; opts?: JobsOptions }[],
): Promise<unknown> {
  if (jobs.length === 0) return Promise.resolve([]);
  return (getQueue(name) as Queue).addBulk(jobs.map((j) => ({ name, data: j.data, opts: j.opts })));
}

/** Convenience accessors for the queues used in the outbound pipeline. */
export const Queues = {
  campaignFanout: () => getQueue(QUEUE_NAMES.campaignFanout),
  sendEmail: () => getQueue(QUEUE_NAMES.sendEmail),
} as const;

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
