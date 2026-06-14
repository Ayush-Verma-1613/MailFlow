/**
 * Server-side glue between stored EmailAccount documents and the provider-
 * agnostic @mailflow/email senders. Owns secret decryption, provider
 * construction, and refreshed-token persistence.
 */
import 'server-only';
import { EmailAccount, decrypt, encrypt, type IEmailAccount } from '@mailflow/db';
import {
  dkimDnsRecord,
  generateMessageId,
  registerGmailWatch,
  resolveProvider,
  type DkimDnsRecord,
  type EmailProvider,
  type GoogleOAuthConfig,
  type SendResult,
} from '@mailflow/email';
import { env } from '@mailflow/shared/env';
import type { HydratedDocument } from 'mongoose';

export const GMAIL_REDIRECT_PATH = '/api/email-accounts/oauth/callback/gmail';

/** OAuth config for the Gmail mailbox-connection flow. */
export function gmailOAuthConfig(): GoogleOAuthConfig {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID/SECRET)');
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${env.APP_URL}${GMAIL_REDIRECT_PATH}`,
  };
}

/** Load an account including its `select:false` secret fields. */
export function loadAccountWithSecrets(
  orgId: string,
  id: string,
): Promise<HydratedDocument<IEmailAccount> | null> {
  return EmailAccount.findOne({ _id: id, orgId })
    .select('+auth.accessToken +auth.refreshToken +auth.pass +auth.apiKey +auth.dkimPrivateKey')
    .exec();
}

/** Construct a ready-to-send provider for an account (decrypting its secrets). */
export function buildProvider(account: HydratedDocument<IEmailAccount>): EmailProvider {
  return resolveProvider(account, {
    decrypt,
    gmailOAuth: account.provider === 'gmail' ? gmailOAuthConfig() : undefined,
    onGmailTokensRefreshed: (tokens) => persistRefreshedGmailTokens(account.id, tokens),
  });
}

/**
 * Best-effort: register a Gmail push watch using freshly-exchanged tokens.
 * No-op when no Pub/Sub topic is configured. Stores the history watermark.
 */
export async function registerWatchWithTokens(
  accountId: string,
  plain: { accessToken: string; refreshToken?: string; expiresAt?: Date },
): Promise<void> {
  if (!env.GMAIL_PUBSUB_TOPIC) return;
  const { historyId, expiration } = await registerGmailWatch(
    { oauth: gmailOAuthConfig(), credentials: plain },
    env.GMAIL_PUBSUB_TOPIC,
  );
  await EmailAccount.updateOne(
    { _id: accountId },
    { $set: { historyId, watchExpiration: expiration } },
  );
}

/** Persist tokens that googleapis refreshed during a send. */
export async function persistRefreshedGmailTokens(
  accountId: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
): Promise<void> {
  const update: Record<string, unknown> = {
    'auth.accessToken': encrypt(tokens.accessToken),
  };
  if (tokens.refreshToken) update['auth.refreshToken'] = encrypt(tokens.refreshToken);
  if (tokens.expiresAt) update['auth.expiresAt'] = tokens.expiresAt;
  await EmailAccount.updateOne({ _id: accountId }, { $set: update });
}

/** Send a one-off test message from an account to verify it works. */
export async function sendTestEmail(
  account: HydratedDocument<IEmailAccount>,
  to: string,
): Promise<SendResult> {
  const provider = buildProvider(account);
  const messageId = generateMessageId(account.fromEmail);
  return provider.send({
    to,
    from: { email: account.fromEmail, name: account.fromName },
    subject: 'MailFlow test email ✅',
    html: `<p>This is a test email from your connected <strong>${account.displayName}</strong> mailbox.</p><p>If you received this, sending works.</p>`,
    text: 'This is a test email from your connected MailFlow mailbox. If you received this, sending works.',
    messageId,
  });
}

/** Shape returned to the client (never includes secrets). */
export interface SanitizedAccount {
  id: string;
  provider: IEmailAccount['provider'];
  displayName: string;
  fromEmail: string;
  fromName: string;
  limits: IEmailAccount['limits'];
  health: IEmailAccount['health'];
  /** Whether outbound mail from this account is DKIM-signed. */
  dkim: boolean;
  /** The DNS TXT record to publish, when a managed key has been generated. */
  dkimRecord: DkimDnsRecord | null;
  createdAt: string;
}

export function sanitizeAccount(account: IEmailAccount): SanitizedAccount {
  const { dkimSelector, dkimPublicKey } = account.auth ?? {};
  const domain = account.fromEmail.split('@')[1];
  // `dkimSelector`/`dkimPublicKey` are non-secret (unlike the private key), so
  // it's safe to surface the publishable DNS record.
  const dkimRecord =
    dkimSelector && dkimPublicKey && domain
      ? dkimDnsRecord(dkimSelector, domain, dkimPublicKey)
      : null;

  return {
    id: account._id.toString(),
    provider: account.provider,
    displayName: account.displayName,
    fromEmail: account.fromEmail,
    fromName: account.fromName,
    limits: account.limits,
    health: account.health,
    dkim: Boolean(dkimSelector),
    dkimRecord,
    createdAt: account.createdAt.toISOString(),
  };
}
