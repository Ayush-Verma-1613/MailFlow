import { z } from 'zod';
import { Contact, List } from '@mailflow/db';
import { objectId } from '@mailflow/shared';

import { notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { recomputeListCount } from '@/lib/contacts-service';

const addContactsSchema = z.object({
  contactIds: z.array(objectId).min(1).max(1000),
});

/**
 * Add existing contacts to a list. `$addToSet` keeps it idempotent (a contact
 * already in the list is untouched), then the list's denormalized count is
 * recomputed so the rail and campaign wizard reflect the change.
 */
export const POST = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('List not found');

    const parsed = await parseBody(req, addContactsSchema);
    if (!parsed.ok) return parsed.response;

    const list = await List.findOne({ _id: id, orgId: ctx.orgId }).select('_id');
    if (!list) return notFound('List not found');

    const res = await Contact.updateMany(
      { orgId: ctx.orgId, _id: { $in: parsed.data.contactIds } },
      { $addToSet: { listIds: id } },
    );

    await recomputeListCount(ctx.orgId, id);
    const contactCount = await Contact.countDocuments({ orgId: ctx.orgId, listIds: id });

    return ok({ added: res.modifiedCount, contactCount });
  },
  { role: 'member' },
);
