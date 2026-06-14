/**
 * Cached Mongoose connection.
 *
 * Works for both consumers:
 *  - Next.js (serverless / dev hot-reload): caches the connection promise on
 *    `globalThis` so repeated module evaluations reuse one pool.
 *  - The long-running worker: same cache, connects once at boot.
 */
import mongoose from 'mongoose';
import { env } from '@mailflow/shared/env';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Reuse across hot reloads in development and across lambda invocations.
const globalForMongoose = globalThis as unknown as {
  __mailflowMongoose?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.__mailflowMongoose ??= {
  conn: null,
  promise: null,
});

const DEFAULT_DB_NAME = 'mailflow';

/** Use the db named in the connection string, falling back to `mailflow`. */
function resolveDbName(uri: string): string {
  try {
    const path = new URL(uri).pathname.replace(/^\//, '');
    return path || DEFAULT_DB_NAME;
  } catch {
    return DEFAULT_DB_NAME;
  }
}

// readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
function isLive(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Reuse only a genuinely live connection. A cached-but-dropped connection
  // (idle socket, network blip, serverless freeze) would otherwise buffer every
  // query until timeout — so discard it and reconnect instead.
  if (cache.conn && isLive()) return cache.conn;
  if (cache.conn && !isLive()) {
    cache.conn = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        // Default to the `mailflow` database when the URI omits one, so dev and
        // prod never silently diverge to the implicit `test` db.
        dbName: resolveDbName(env.MONGODB_URI),
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
        // Fail fast on a dead connection rather than buffering for 10s; callers
        // always await connectToDatabase() first, so the pool is ready.
        bufferCommands: false,
      })
      .then((m) => {
        cache.conn = m;
        return m;
      })
      .catch((e) => {
        cache.promise = null;
        throw e;
      });
  }

  return cache.promise;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}

export { mongoose };
