import { ApiKey } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';

/** Revoke (delete) an API key. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('API key not found');
    const res = await ApiKey.findOneAndDelete({ _id: id, orgId: ctx.orgId });
    if (!res) return notFound('API key not found');
    await audit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'apikey.revoke',
      target: { kind: 'ApiKey', id },
    });
    return ok({ revoked: true });
  },
  { role: 'admin' },
);
