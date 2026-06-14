import { ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { getOverview } from '@/lib/analytics-service';

/** Org-wide analytics: funnel totals, rates, intent breakdown, status counts. */
export const GET = withOrg(async (_req, ctx) => {
  return ok(await getOverview(ctx.orgId));
});
