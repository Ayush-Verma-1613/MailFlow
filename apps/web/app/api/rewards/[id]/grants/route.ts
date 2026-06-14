import { Contact, Reward } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** The grant log for a reward (who received it + when). */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Reward not found');

  const reward = await Reward.findOne({ _id: id, orgId: ctx.orgId }).lean();
  if (!reward) return notFound('Reward not found');

  const contactIds = reward.recipients.map((r) => r.contactId);
  const contacts = await Contact.find({ _id: { $in: contactIds } })
    .select('email')
    .lean();
  const emailById = new Map(contacts.map((c) => [c._id.toString(), c.email]));

  return ok({
    grants: reward.recipients
      .map((r) => ({
        contactId: r.contactId.toString(),
        email: emailById.get(r.contactId.toString()) ?? '—',
        grantedAt: r.grantedAt.toISOString(),
        ref: r.ref,
      }))
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt)),
  });
});
