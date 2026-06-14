import { EmailAccount } from '@mailflow/db';
import { EmailSendError } from '@mailflow/email';
import { testSendSchema } from '@mailflow/shared';

import { badRequest, notFound, ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';
import { loadAccountWithSecrets, sendTestEmail } from '@/lib/email-account';

/** Send a test email from a connected mailbox. */
export const POST = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Account not found');

    const parsed = await parseBody(req, testSendSchema);
    if (!parsed.ok) return parsed.response;

    const account = await loadAccountWithSecrets(ctx.orgId, id);
    if (!account) return notFound('Account not found');

    try {
      const result = await sendTestEmail(account, parsed.data.to);
      await EmailAccount.updateOne(
        { _id: id },
        { $set: { 'health.status': 'connected', 'health.lastError': null } },
      );
      await audit({
        orgId: ctx.orgId,
        actorId: ctx.userId,
        action: 'account.test_send',
        target: { kind: 'EmailAccount', id },
        meta: { to: parsed.data.to, messageId: result.messageId },
      });
      return ok({ sent: true, messageId: result.messageId });
    } catch (error) {
      const message =
        error instanceof EmailSendError ? error.message : 'Failed to send test email';
      await EmailAccount.updateOne(
        { _id: id },
        { $set: { 'health.status': 'error', 'health.lastError': message } },
      );
      console.error('[test send] error:', error);
      return badRequest(message);
    }
  },
  { role: 'member' },
);
