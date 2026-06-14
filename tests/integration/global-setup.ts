import { randomBytes } from 'node:crypto';
import type { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Boots an ephemeral MongoDB once for the whole integration run and populates
 * the env the apps require. Runs in the main process before workers fork, so
 * the (lazily-parsed, then cached) `@mailflow/shared/env` reads a stable
 * MONGODB_URI. The mongod binary is fetched on first run and cached after.
 */
let mongo: MongoMemoryServer | undefined;

export async function setup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_SECRET ||= randomBytes(24).toString('hex');
  process.env.ENCRYPTION_KEY ||= randomBytes(32).toString('base64');
  // Dummy unless a real Redis is provided for the gated rate-limiter tests.
  process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('mailflow_test');
}

export async function teardown(): Promise<void> {
  await mongo?.stop();
}
