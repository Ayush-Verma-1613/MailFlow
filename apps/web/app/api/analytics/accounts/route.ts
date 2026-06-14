import { ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { getAccountAnalytics } from '@/lib/analytics-service';

/** Per-sender health + lifetime sent counts. */
export const GET = withOrg(async (_req, ctx) => {
  return ok({ accounts: await getAccountAnalytics(ctx.orgId) });
});
