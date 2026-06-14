import { describe, expect, it } from 'vitest';
import { QUEUE_NAMES } from '@mailflow/shared';

import { enqueueBulk } from './queues';

describe('enqueueBulk', () => {
  it('short-circuits an empty batch without touching Redis', async () => {
    // No connection is opened for an empty batch, so this is safe with no Redis.
    await expect(enqueueBulk(QUEUE_NAMES.sendEmail, [])).resolves.toEqual([]);
  });
});
