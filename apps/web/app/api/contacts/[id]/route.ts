import { Contact } from '@mailflow/db';
import { contactUpdateSchema } from '@mailflow/shared';

import { notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Update a contact. */
export const PATCH = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Contact not found');
    const parsed = await parseBody(req, contactUpdateSchema);
    if (!parsed.ok) return parsed.response;

    const { customFields, ...rest } = parsed.data;
    const set: Record<string, unknown> = { ...rest };
    if (customFields) {
      for (const [k, v] of Object.entries(customFields)) set[`customFields.${k}`] = v;
    }

    const contact = await Contact.findOneAndUpdate(
      { _id: id, orgId: ctx.orgId },
      { $set: set },
      { new: true },
    );
    if (!contact) return notFound('Contact not found');
    return ok({ id: contact._id.toString() });
  },
  { role: 'member' },
);

/** Delete a contact. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Contact not found');
    const res = await Contact.deleteOne({ _id: id, orgId: ctx.orgId });
    if (res.deletedCount === 0) return notFound('Contact not found');
    return ok({ deleted: true });
  },
  { role: 'member' },
);
