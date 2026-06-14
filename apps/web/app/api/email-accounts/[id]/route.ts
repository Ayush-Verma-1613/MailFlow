import { EmailAccount } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';

/** Disconnect (delete) a mailbox. */
export const DELETE = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Account not found');
    const account = await EmailAccount.findOneAndDelete({ _id: id, orgId: ctx.orgId });
    if (!account) return notFound('Account not found');

    await audit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'account.disconnect',
      target: { kind: 'EmailAccount', id },
      meta: { provider: account.provider, email: account.fromEmail },
    });

    return ok({ deleted: true });
  },
  { role: 'admin' },
);
