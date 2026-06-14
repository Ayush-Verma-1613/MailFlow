/**
 * Centralised, zod-validated environment access.
 *
 * SERVER-ONLY. Never import this from a client component — it reads secrets.
 * Import via the `@mailflow/shared/env` subpath so client bundles never pull it
 * in transitively from the package root.
 *
 * Validation is lazy + cached: merely importing this module does nothing; the
 * schema is parsed on first `env.X` access, so a missing var fails fast with a
 * readable message exactly when (and only when) something needs it.
 */
import { z } from 'zod';

const NodeEnv = z.enum(['development', 'test', 'production']);

const envSchema = z.object({
  // Runtime
  NODE_ENV: NodeEnv.default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Core infrastructure (required to do anything useful)
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Auth.js
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be a long random string'),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Encryption (32-byte key, base64 → 44 chars incl. padding)
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be a base64-encoded 32-byte key'),

  // Transactional email (optional) — used to send account-verification mail.
  // When unset, verification links are logged instead of emailed.
  SYSTEM_SMTP_URL: z.string().optional(),
  SYSTEM_EMAIL_FROM: z.string().optional(),

  // Integrations (optional until their phase is reached)
  OPENROUTER_API_KEY: z.string().optional(),
  GMAIL_PUBSUB_TOPIC: z.string().optional(),
  GMAIL_PUBSUB_VERIFICATION_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env and fill in the required values.',
    );
  }
  return parsed.data;
}

/**
 * Validated env. Access lazily — the first property read triggers validation
 * and caches the result for the process lifetime.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    cached ??= parseEnv();
    return cached[prop as keyof Env];
  },
});

/** Force-validate now (e.g. at worker boot) to fail fast instead of lazily. */
export function assertEnv(): Env {
  cached ??= parseEnv();
  return cached;
}

/** Convenience flags. */
export const isProd = (): boolean => env.NODE_ENV === 'production';
export const isDev = (): boolean => env.NODE_ENV === 'development';
export const isTest = (): boolean => env.NODE_ENV === 'test';
