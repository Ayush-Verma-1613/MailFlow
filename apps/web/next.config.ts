import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Single source of truth: load the monorepo-root `.env` (shared with the
 * worker) into `process.env` before the app reads any variables. Existing
 * values win, so platform-provided env (Vercel) is never overridden.
 */
function loadRootEnv(): void {
  try {
    const file = path.resolve(process.cwd(), '../../.env');
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      // Strip matching surrounding quotes (Upstash etc. often paste quoted).
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^(['"])([\s\S]*)\1$/, '$2');
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No root .env (e.g. CI with platform env vars) — that's fine.
  }
}

loadRootEnv();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Consume internal packages as TypeScript source (no pre-build step).
  transpilePackages: [
    '@mailflow/shared',
    '@mailflow/db',
    '@mailflow/email',
    '@mailflow/queue',
  ],
  // Server-only packages kept external to the bundle.
  serverExternalPackages: [
    'mongoose',
    'bcryptjs',
    'googleapis',
    'nodemailer',
    'bullmq',
    'ioredis',
    '@sentry/node',
  ],
  eslint: {
    // Lint is run as a separate CI step; don't fail production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
