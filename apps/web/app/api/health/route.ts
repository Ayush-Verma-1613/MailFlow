import { connectToDatabase, mongoose } from '@mailflow/db';
import { getRedis } from '@mailflow/queue';

/** Liveness/readiness probe: verifies Mongo + Redis connectivity. */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = { db: 'error', redis: 'error' };

  try {
    await connectToDatabase();
    checks.db = mongoose.connection.readyState === 1 ? 'ok' : 'error';
  } catch {
    checks.db = 'error';
  }

  try {
    const pong = await getRedis().ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'error';
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks).every((c) => c === 'ok');
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
