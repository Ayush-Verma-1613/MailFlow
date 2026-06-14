/**
 * Next.js instrumentation hook. Initializes Sentry on the Node.js server
 * runtime when SENTRY_DSN is configured (no-op otherwise).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}
