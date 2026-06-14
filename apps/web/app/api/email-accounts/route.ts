import { EmailAccount } from '@mailflow/db';

import { ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { sanitizeAccount } from '@/lib/email-account';

/** List connected mailboxes for the org (secrets stripped). */
export const GET = withOrg(async (_req, ctx) => {
  const accounts = await EmailAccount.find({ orgId: ctx.orgId })
    .sort({ createdAt: -1 })
    .lean();
  return ok({ accounts: accounts.map(sanitizeAccount) });
});
