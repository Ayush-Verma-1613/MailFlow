/**
 * Shared ioredis connection for BullMQ. Both the web app (producers) and the
 * worker (consumers) connect to the same Redis instance.
 */
import { Redis } from 'ioredis';
import { env } from '@mailflow/shared/env';

const globalForRedis = globalThis as unknown as { __mailflowRedis?: Redis };

export function getRedis(): Redis {
  if (globalForRedis.__mailflowRedis) return globalForRedis.__mailflowRedis;

  const client = new Redis(env.REDIS_URL, {
    // Required by BullMQ: blocking commands must never give up.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  client.on('error', (err) => {
    console.error('[redis] connection error:', err.message);
  });

  globalForRedis.__mailflowRedis = client;
  return client;
}

export async function closeRedis(): Promise<void> {
  if (globalForRedis.__mailflowRedis) {
    await globalForRedis.__mailflowRedis.quit();
    globalForRedis.__mailflowRedis = undefined;
  }
}
