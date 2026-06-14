import { EmailAccount, encrypt } from '@mailflow/db';
import { dkimDnsRecord, generateDkimKeyPair } from '@mailflow/email';

import { badRequest, notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';
import { randomToken } from '@/lib/slug';

/**
 * Generate (or rotate) a managed DKIM keypair for an SMTP account. We store the
 * private key encrypted and return the DNS TXT record for the user to publish.
 * A fresh selector each time means rotating doesn't disturb the old record.
 */
export const POST = withOrg(
  async (_req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Account not found');

    const account = await EmailAccount.findOne({ _id: id, orgId: ctx.orgId });
    if (!account) return notFound('Account not found');
    if (account.provider !== 'smtp') {
      return badRequest('DKIM signing applies to SMTP accounts (Gmail signs its own mail)');
    }

    const domain = account.fromEmail.split('@')[1];
    if (!domain) return badRequest('Account has no sending domain');

    const { privateKeyPem, publicKeyBase64 } = generateDkimKeyPair();
    const selector = `mf-${randomToken(4)}`;

    account.auth.dkimPrivateKey = encrypt(privateKeyPem);
    account.auth.dkimSelector = selector;
    account.auth.dkimPublicKey = publicKeyBase64;
    await account.save();

    await audit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'account.dkim.generate',
      target: { kind: 'EmailAccount', id },
      meta: { selector },
    });

    return ok({ record: dkimDnsRecord(selector, domain, publicKeyBase64), selector });
  },
  { role: 'admin' },
);
