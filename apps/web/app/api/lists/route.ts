import { List } from '@mailflow/db';
import { listCreateSchema } from '@mailflow/shared';

import { conflict, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** All lists for the org. */
export const GET = withOrg(async (_req, ctx) => {
  const lists = await List.find({ orgId: ctx.orgId }).sort({ name: 1 }).lean();
  return ok({
    lists: lists.map((l) => ({
      id: l._id.toString(),
      name: l.name,
      contactCount: l.contactCount,
    })),
  });
});

/** Create a list. */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, listCreateSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await List.findOne({ orgId: ctx.orgId, name: parsed.data.name });
    if (existing) return conflict('A list with that name already exists');

    const list = await List.create({ orgId: ctx.orgId, name: parsed.data.name });
    return ok(
      { list: { id: list._id.toString(), name: list.name, contactCount: 0 } },
      { status: 201 },
    );
  },
  { role: 'member' },
);
