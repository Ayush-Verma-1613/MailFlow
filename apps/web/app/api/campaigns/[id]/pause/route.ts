import { Campaign } from '@mailflow/db';

import { badRequest, notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';

/** Pause a running/scheduled campaign. In-flight send jobs stop sending. */
export const POST = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Campaign not found');

    const campaign = await Campaign.findOne({ _id: id, orgId: ctx.orgId });
    if (!campaign) return notFound('Campaign not found');
    if (!['scheduled', 'running'].includes(campaign.status)) {
      return badRequest(`Cannot pause a ${campaign.status} campaign`);
    }

    campaign.status = 'paused';
    await campaign.save();

    await audit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'campaign.pause',
      target: { kind: 'Campaign', id },
    });

    return ok({ status: 'paused' });
  },
  { role: 'member' },
);
