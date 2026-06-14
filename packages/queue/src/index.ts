/**
 * @mailflow/queue — BullMQ queues + Redis connection shared by web + worker.
 * Server-only (connects to Redis).
 */
export { getRedis, closeRedis } from './connection';
export { getQueue, enqueue, enqueueBulk, Queues, closeQueues } from './queues';
export {
  consumeSendToken,
  getSendUsage,
  rateLimit,
  type ConsumeResult,
  type RateLimitResult,
} from './rate-limiter';
export * from './jobs';
