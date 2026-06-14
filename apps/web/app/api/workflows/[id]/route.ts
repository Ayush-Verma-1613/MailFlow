import { Workflow } from '@mailflow/db';
import { workflowUpdateSchema } from '@mailflow/shared';

import { notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Full workflow (for the builder). */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Workflow not found');
  const w = await Workflow.findOne({ _id: id, orgId: ctx.orgId }).lean();
  if (!w) return notFound('Workflow not found');
  return ok({
    workflow: {
      id: w._id.toString(),
      name: w.name,
      enabled: w.enabled,
      trigger: w.trigger,
      steps: w.steps,
    },
  });
});

/** Update a workflow. */
export const PATCH = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Workflow not found');
    const parsed = await parseBody(req, workflowUpdateSchema);
    if (!parsed.ok) return parsed.response;

    const w = await Workflow.findOneAndUpdate(
      { _id: id, orgId: ctx.orgId },
      { $set: parsed.data },
      { new: true },
    );
    if (!w) return notFound('Workflow not found');
    return ok({ id: w._id.toString() });
  },
  { role: 'member' },
);

/** Delete a workflow. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Workflow not found');
    const res = await Workflow.deleteOne({ _id: id, orgId: ctx.orgId });
    if (res.deletedCount === 0) return notFound('Workflow not found');
    return ok({ deleted: true });
  },
  { role: 'member' },
);
