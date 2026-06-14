import { WorkflowRun } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Recent runs for a workflow (execution history + step logs). */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Workflow not found');

  const runs = await WorkflowRun.find({ workflowId: id, orgId: ctx.orgId })
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();

  return ok({
    runs: runs.map((r) => ({
      id: r._id.toString(),
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString(),
      log: r.log.map((l) => ({ level: l.level, message: l.message })),
    })),
  });
});
