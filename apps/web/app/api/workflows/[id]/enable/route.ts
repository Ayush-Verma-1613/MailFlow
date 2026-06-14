import { z } from 'zod';
import { Workflow } from '@mailflow/db';

import { notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

const bodySchema = z.object({ enabled: z.boolean() });

/** Toggle a workflow on/off. */
export const POST = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Workflow not found');
    const parsed = await parseBody(req, bodySchema);
    if (!parsed.ok) return parsed.response;

    const w = await Workflow.findOneAndUpdate(
      { _id: id, orgId: ctx.orgId },
      { $set: { enabled: parsed.data.enabled } },
      { new: true },
    );
    if (!w) return notFound('Workflow not found');
    return ok({ enabled: w.enabled });
  },
  { role: 'member' },
);
