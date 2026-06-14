import { getQueue } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';

import { ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/**
 * Queue health: per-queue job counts (a lightweight, Next-native stand-in for
 * BullBoard). Admin only. Counts are global to the Redis instance, not org-scoped.
 */
export const GET = withOrg(
  async () => {
    const names = Object.values(QUEUE_NAMES);
    const queues = await Promise.all(
      names.map(async (name) => {
        try {
          const counts = await getQueue(name).getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
          );
          return { name, counts, ok: true };
        } catch {
          return {
            name,
            counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
            ok: false,
          };
        }
      }),
    );
    return ok({ queues });
  },
  { role: 'admin' },
);
