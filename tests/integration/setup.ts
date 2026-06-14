import { afterEach, beforeAll } from 'vitest';

/**
 * Per-worker DB lifecycle: connect once (the connection is a process singleton),
 * and wipe all collections between tests so each starts from a clean slate.
 * The Mongo server itself is started/stopped by global-setup.
 */
beforeAll(async () => {
  const { connectToDatabase } = await import('@mailflow/db');
  await connectToDatabase();
});

afterEach(async () => {
  const { mongoose } = await import('@mailflow/db');
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
