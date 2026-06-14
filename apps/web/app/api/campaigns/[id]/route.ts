import { Campaign } from '@mailflow/db';
import { campaignUpdateSchema } from '@mailflow/shared';

import { badRequest, notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Campaign detail. */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Campaign not found');
  const c = await Campaign.findOne({ _id: id, orgId: ctx.orgId }).lean();
  if (!c) return notFound('Campaign not found');
  return ok({
    campaign: {
      id: c._id.toString(),
      name: c.name,
      status: c.status,
      listIds: c.listIds.map((x) => x.toString()),
      senderPoolIds: c.senderPoolIds.map((x) => x.toString()),
      templateId: c.templateId.toString(),
      rotation: c.rotation,
      schedule: c.schedule,
      stats: c.stats,
      createdAt: c.createdAt.toISOString(),
    },
  });
});

/** Update a campaign (only while it's a draft). */
export const PATCH = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Campaign not found');
    const parsed = await parseBody(req, campaignUpdateSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await Campaign.findOne({ _id: id, orgId: ctx.orgId });
    if (!existing) return notFound('Campaign not found');
    if (existing.status !== 'draft') {
      return badRequest('Only draft campaigns can be edited');
    }

    existing.set(parsed.data);
    await existing.save();
    return ok({ id: existing._id.toString() });
  },
  { role: 'member' },
);

/** Delete a campaign. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Campaign not found');
    const res = await Campaign.deleteOne({ _id: id, orgId: ctx.orgId });
    if (res.deletedCount === 0) return notFound('Campaign not found');
    return ok({ deleted: true });
  },
  { role: 'admin' },
);
