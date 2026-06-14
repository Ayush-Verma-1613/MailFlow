import { createServer, type Server } from 'node:http';
import { mongoose } from '@mailflow/db';
import { getRedis } from '@mailflow/queue';

import { logger } from './logger';

/**
 * Tiny HTTP health server for the worker process (Railway/Docker probes).
 * Listens on HEALTH_PORT (default 8080), responding 200 when Mongo + Redis are up.
 */
export function startHealthServer(): Server {
  const port = Number(process.env.HEALTH_PORT ?? 8080);

  const server = createServer((req, res) => {
    if (req.url !== '/health') {
      res.writeHead(404).end();
      return;
    }
    void (async () => {
      const dbOk = mongoose.connection.readyState === 1;
      let redisOk = false;
      try {
        redisOk = (await getRedis().ping()) === 'PONG';
      } catch {
        redisOk = false;
      }
      const healthy = dbOk && redisOk;
      res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded', db: dbOk, redis: redisOk }));
    })();
  });

  server.listen(port, () => logger.info({ port }, 'health server listening'));
  return server;
}
