import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { getCampaignAnalytics } from '@/lib/analytics-service';

/** Per-campaign funnel + recipient status breakdown. */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Campaign not found');
  const data = await getCampaignAnalytics(ctx.orgId, id);
  if (!data) return notFound('Campaign not found');
  return ok(data);
});
