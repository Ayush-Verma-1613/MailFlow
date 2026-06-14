import { Campaign } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Live campaign stats (polled by the detail page). */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Campaign not found');
  const c = await Campaign.findOne({ _id: id, orgId: ctx.orgId })
    .select('status stats')
    .lean();
  if (!c) return notFound('Campaign not found');
  return ok({ status: c.status, stats: c.stats });
});
