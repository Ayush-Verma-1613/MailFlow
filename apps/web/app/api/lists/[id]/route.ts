import { z } from 'zod';
import { Contact, List } from '@mailflow/db';

import { notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

const renameSchema = z.object({ name: z.string().trim().min(1).max(120) });

/** Rename a list. */
export const PATCH = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('List not found');
    const parsed = await parseBody(req, renameSchema);
    if (!parsed.ok) return parsed.response;

    const list = await List.findOneAndUpdate(
      { _id: id, orgId: ctx.orgId },
      { $set: { name: parsed.data.name } },
      { new: true },
    );
    if (!list) return notFound('List not found');
    return ok({ list: { id: list._id.toString(), name: list.name } });
  },
  { role: 'member' },
);

/** Delete a list and detach it from its contacts. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('List not found');

    const list = await List.findOneAndDelete({ _id: id, orgId: ctx.orgId });
    if (!list) return notFound('List not found');

    await Contact.updateMany(
      { orgId: ctx.orgId, listIds: id },
      { $pull: { listIds: id } },
    );
    return ok({ deleted: true });
  },
  { role: 'admin' },
);
