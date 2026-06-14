/** Optional Sentry error reporting for the worker (no-op without SENTRY_DSN). */
import * as Sentry from '@sentry/node';
import { env } from '@mailflow/shared/env';

let enabled = false;

export function initObservability(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
  enabled = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
