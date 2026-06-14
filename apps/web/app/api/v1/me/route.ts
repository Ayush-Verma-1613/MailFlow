import { Org } from '@mailflow/db';

import { ok, notFound } from '@/lib/api';
import { withApiKey } from '@/lib/withApiKey';

/** Public API: identify the org behind the API key. */
export const GET = withApiKey(async (_req, ctx) => {
  const org = await Org.findById(ctx.orgId).lean();
  if (!org) return notFound('Org not found');
  return ok({
    org: { id: org._id.toString(), name: org.name, slug: org.slug, plan: org.plan },
    scopes: ctx.scopes,
  });
});
