import { afterAll, describe, expect, it } from 'vitest';

// Redis-backed; opt in with RUN_REDIS_TESTS=1 and a reachable REDIS_URL.
const run = process.env.RUN_REDIS_TESTS === '1';

describe.skipIf(!run)('rate limiter (integration, redis)', () => {
  afterAll(async () => {
    const { closeRedis } = await import('@mailflow/queue');
    await closeRedis();
  });

  it('allows up to the limit then blocks within the window', async () => {
    const { rateLimit } = await import('@mailflow/queue');
    const key = `it-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect((await rateLimit(key, { limit: 3, windowSec: 60 })).allowed).toBe(true);
    }
    const blocked = await rateLimit(key, { limit: 3, windowSec: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('enforces the per-account hourly send cap', async () => {
    const { consumeSendToken } = await import('@mailflow/queue');
    const account = `acct-${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      expect((await consumeSendToken(account, { hourlyCap: 2, dailyCap: 100 })).allowed).toBe(true);
    }
    const capped = await consumeSendToken(account, { hourlyCap: 2, dailyCap: 100 });
    expect(capped.allowed).toBe(false);
    expect(capped.reason).toBe('hour');
  });
});
