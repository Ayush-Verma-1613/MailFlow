/**
 * Standalone Google OAuth for *connecting a Gmail sending mailbox*. This is
 * distinct from the NextAuth login flow: it requests Gmail scopes and we store
 * the resulting tokens (encrypted) on an EmailAccount.
 */
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

/** Scopes needed to send, read, and manage the connected Gmail mailbox. */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function createOAuthClient(config: GoogleOAuthConfig): OAuth2Client {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

/** Build the consent URL. `state` is an opaque CSRF token we verify on return. */
export function buildConsentUrl(config: GoogleOAuthConfig, state: string): string {
  const client = createOAuthClient(config);
  return client.generateAuthUrl({
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh-token issuance on re-consent
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export interface ExchangedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email: string;
}

/** Exchange an authorization code for tokens and resolve the mailbox address. */
export async function exchangeCode(
  config: GoogleOAuthConfig,
  code: string,
): Promise<ExchangedTokens> {
  const client = createOAuthClient(config);
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error('Google did not return an access token');
  }
  client.setCredentials(tokens);

  // Resolve which Gmail address was connected.
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) {
    throw new Error('Could not read the connected account email');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    email: data.email,
  };
}
