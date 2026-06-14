/** Build a sending provider from a stored EmailAccount (worker side). */
import { EmailAccount, decrypt, encrypt, type IEmailAccount } from '@mailflow/db';
import {
  resolveProvider,
  type EmailProvider,
  type GmailClientOptions,
  type GoogleOAuthConfig,
} from '@mailflow/email';
import { env } from '@mailflow/shared/env';
import type { HydratedDocument } from 'mongoose';

function gmailOAuthConfig(): GoogleOAuthConfig {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth not configured for Gmail sending');
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${env.APP_URL}/api/email-accounts/oauth/callback/gmail`,
  };
}

/** Build Gmail read-client options (watch/history/fetch) from an account. */
export function gmailClientOptions(account: HydratedDocument<IEmailAccount>): GmailClientOptions {
  const { accessToken, refreshToken, expiresAt } = account.auth;
  if (!accessToken) throw new Error('Gmail account is missing an access token');
  return {
    oauth: gmailOAuthConfig(),
    credentials: {
      accessToken: decrypt(accessToken),
      refreshToken: refreshToken ? decrypt(refreshToken) : undefined,
      expiresAt,
    },
    onTokensRefreshed: async (tokens) => {
      const update: Record<string, unknown> = {
        'auth.accessToken': encrypt(tokens.accessToken),
      };
      if (tokens.refreshToken) update['auth.refreshToken'] = encrypt(tokens.refreshToken);
      if (tokens.expiresAt) update['auth.expiresAt'] = tokens.expiresAt;
      await EmailAccount.updateOne({ _id: account.id }, { $set: update });
    },
  };
}

/** Load an account with its encrypted secret fields. */
export function loadAccountWithSecrets(
  id: string,
): Promise<HydratedDocument<IEmailAccount> | null> {
  return EmailAccount.findById(id)
    .select('+auth.accessToken +auth.refreshToken +auth.pass +auth.apiKey +auth.dkimPrivateKey')
    .exec();
}

export function buildProvider(account: HydratedDocument<IEmailAccount>): EmailProvider {
  return resolveProvider(account, {
    decrypt,
    gmailOAuth: account.provider === 'gmail' ? gmailOAuthConfig() : undefined,
    onGmailTokensRefreshed: async (tokens) => {
      const update: Record<string, unknown> = {
        'auth.accessToken': encrypt(tokens.accessToken),
      };
      if (tokens.refreshToken) update['auth.refreshToken'] = encrypt(tokens.refreshToken);
      if (tokens.expiresAt) update['auth.expiresAt'] = tokens.expiresAt;
      await EmailAccount.updateOne({ _id: account.id }, { $set: update });
    },
  });
}
