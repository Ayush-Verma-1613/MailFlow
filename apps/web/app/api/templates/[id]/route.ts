import { Template } from '@mailflow/db';
import { extractMergeTags, templateUpdateSchema } from '@mailflow/shared';

import { notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Full template (including bodies) — used by the editor. */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Template not found');
  const t = await Template.findOne({ _id: id, orgId: ctx.orgId }).lean();
  if (!t) return notFound('Template not found');
  return ok({
    template: {
      id: t._id.toString(),
      name: t.name,
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      bodyText: t.bodyText,
      category: t.category,
      mergeTags: t.mergeTags ?? [],
      variants: t.variants ?? [],
    },
  });
});

/** Update a template, recomputing merge tags. */
export const PATCH = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Template not found');
    const parsed = await parseBody(req, templateUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    const set: Record<string, unknown> = { ...input };
    if (input.subject !== undefined || input.bodyHtml !== undefined) {
      const current = await Template.findOne({ _id: id, orgId: ctx.orgId }).lean();
      if (!current) return notFound('Template not found');
      set.mergeTags = extractMergeTags(
        input.subject ?? current.subject,
        input.bodyHtml ?? current.bodyHtml,
      );
    }

    const t = await Template.findOneAndUpdate(
      { _id: id, orgId: ctx.orgId },
      { $set: set },
      { new: true },
    );
    if (!t) return notFound('Template not found');
    return ok({ id: t._id.toString() });
  },
  { role: 'member' },
);

/** Delete a template. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Template not found');
    const res = await Template.deleteOne({ _id: id, orgId: ctx.orgId });
    if (res.deletedCount === 0) return notFound('Template not found');
    return ok({ deleted: true });
  },
  { role: 'member' },
);
