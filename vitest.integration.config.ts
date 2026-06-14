import { defineConfig } from 'vitest/config';

/**
 * Integration tests run against a real (ephemeral) MongoDB via
 * mongodb-memory-server, and — when RUN_REDIS_TESTS=1 with a reachable
 * REDIS_URL — a real Redis. Kept separate from the unit suite (`pnpm test`)
 * because they need infrastructure and are slower.
 *
 *   pnpm test:integration
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['./tests/integration/global-setup.ts'],
    setupFiles: ['./tests/integration/setup.ts'],
    environment: 'node',
    // One process so a single Mongo instance is shared across files.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
