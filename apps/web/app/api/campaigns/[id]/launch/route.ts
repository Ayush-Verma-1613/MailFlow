import { Campaign } from '@mailflow/db';
import { enqueue } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';

import { badRequest, notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';

/** Launch a campaign: mark scheduled and enqueue the fanout job. */
export const POST = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Campaign not found');

    const campaign = await Campaign.findOne({ _id: id, orgId: ctx.orgId });
    if (!campaign) return notFound('Campaign not found');
    if (campaign.status === 'running' || campaign.status === 'completed') {
      return badRequest(`Campaign is already ${campaign.status}`);
    }
    if (campaign.listIds.length === 0 || campaign.senderPoolIds.length === 0) {
      return badRequest('Campaign needs at least one list and one sender');
    }

    campaign.status = 'scheduled';
    await campaign.save();

    await enqueue(
      QUEUE_NAMES.campaignFanout,
      { orgId: ctx.orgId, campaignId: id },
      { jobId: `fanout-${id}-${Date.now()}` },
    );

    await audit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'campaign.launch',
      target: { kind: 'Campaign', id },
    });

    return ok({ status: 'scheduled' });
  },
  { role: 'member' },
);
