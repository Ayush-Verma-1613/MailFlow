import { Message } from '@mailflow/db';
import { enqueue } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';

import { badRequest, notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/**
 * Regenerate the AI analysis (intent + suggested reply) for an inbound message.
 * Enqueues an ai-analyze job; the inbox re-fetches the thread to show the
 * refreshed draft.
 */
export const POST = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Message not found');

    const message = await Message.findOne({ _id: id, orgId: ctx.orgId })
      .select('direction')
      .lean();
    if (!message) return notFound('Message not found');
    if (message.direction !== 'in') {
      return badRequest('Only inbound messages can be analyzed');
    }

    await enqueue(
      QUEUE_NAMES.aiAnalyze,
      { orgId: ctx.orgId, messageId: id },
      { jobId: `ai-regen-${id}-${Date.now()}` },
    );
    return ok({ queued: true });
  },
  { role: 'member' },
);
