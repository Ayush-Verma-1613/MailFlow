import { Workflow } from '@mailflow/db';
import { workflowCreateSchema } from '@mailflow/shared';

import { ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** List workflows for the org. */
export const GET = withOrg(async (_req, ctx) => {
  const docs = await Workflow.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).lean();
  return ok({
    workflows: docs.map((w) => ({
      id: w._id.toString(),
      name: w.name,
      enabled: w.enabled,
      trigger: w.trigger,
      stepCount: w.steps.length,
      createdAt: w.createdAt.toISOString(),
    })),
  });
});

/** Create a workflow (disabled by default). */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, workflowCreateSchema);
    if (!parsed.ok) return parsed.response;

    const workflow = await Workflow.create({
      orgId: ctx.orgId,
      ...parsed.data,
      createdBy: ctx.userId,
    });
    return ok({ id: workflow._id.toString() }, { status: 201 });
  },
  { role: 'member' },
);
