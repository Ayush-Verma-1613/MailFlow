import { Reward, encrypt } from '@mailflow/db';
import { rewardCreateSchema } from '@mailflow/shared';

import { ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** List rewards with grant counts (secrets never returned). */
export const GET = withOrg(async (_req, ctx) => {
  const docs = await Reward.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).lean();
  return ok({
    rewards: docs.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      url: r.grantAction.url,
      type: r.grantAction.type,
      hasSecret: Boolean(r.grantAction.secret),
      grantCount: r.recipients.length,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

/** Create a reward. The HMAC secret is encrypted at rest. */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, rewardCreateSchema);
    if (!parsed.ok) return parsed.response;
    const { name, grantAction } = parsed.data;

    const reward = await Reward.create({
      orgId: ctx.orgId,
      name,
      condition: { matchAll: [] },
      grantAction: {
        type: grantAction.type,
        url: grantAction.url,
        payloadTemplate: grantAction.payloadTemplate,
        secret: grantAction.secret ? encrypt(grantAction.secret) : undefined,
      },
      recipients: [],
    });
    return ok({ id: reward._id.toString() }, { status: 201 });
  },
  { role: 'admin' },
);
