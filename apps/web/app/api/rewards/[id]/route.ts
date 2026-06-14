import { Reward } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Delete a reward. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Reward not found');
    const res = await Reward.deleteOne({ _id: id, orgId: ctx.orgId });
    if (res.deletedCount === 0) return notFound('Reward not found');
    return ok({ deleted: true });
  },
  { role: 'admin' },
);
