import { Campaign, campaignStatsDefault } from '@mailflow/db';
import { campaignCreateSchema } from '@mailflow/shared';

import { ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** List campaigns with their stats. */
export const GET = withOrg(async (_req, ctx) => {
  const docs = await Campaign.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).lean();
  return ok({
    campaigns: docs.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      status: c.status,
      stats: c.stats,
      rotation: c.rotation,
      createdAt: c.createdAt.toISOString(),
    })),
  });
});

/** Create a draft campaign. */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, campaignCreateSchema);
    if (!parsed.ok) return parsed.response;

    const campaign = await Campaign.create({
      orgId: ctx.orgId,
      ...parsed.data,
      status: 'draft',
      stats: campaignStatsDefault(),
      createdBy: ctx.userId,
    });
    return ok({ id: campaign._id.toString() }, { status: 201 });
  },
  { role: 'member' },
);
