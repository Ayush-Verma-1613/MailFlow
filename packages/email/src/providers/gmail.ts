import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';

import { buildRawMime } from '../mime';
import {
  EmailSendError,
  type EmailProvider,
  type SendErrorKind,
  type SendInput,
  type SendResult,
} from '../types';
import { createOAuthClient, type GoogleOAuthConfig } from '../oauth/google';

export interface GmailCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface GmailProviderOptions {
  oauth: GoogleOAuthConfig;
  credentials: GmailCredentials;
  /**
   * Called when googleapis silently refreshes the access token, so the caller
   * can persist the new token/expiry back onto the EmailAccount.
   */
  onTokensRefreshed?: (tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }) => void | Promise<void>;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class GmailProvider implements EmailProvider {
  readonly kind = 'gmail' as const;
  private readonly client: OAuth2Client;

  constructor(options: GmailProviderOptions) {
    this.client = createOAuthClient(options.oauth);
    this.client.setCredentials({
      access_token: options.credentials.accessToken,
      refresh_token: options.credentials.refreshToken,
      expiry_date: options.credentials.expiresAt?.getTime(),
    });

    this.client.on('tokens', (tokens: Credentials) => {
      if (!tokens.access_token) return;
      void options.onTokensRefreshed?.({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? options.credentials.refreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      });
    });
  }

  private gmail() {
    return google.gmail({ version: 'v1', auth: this.client });
  }

  async send(input: SendInput): Promise<SendResult> {
    try {
      const raw = base64url(await buildRawMime(input));
      const res = await this.gmail().users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      // Gmail may assign its own RFC822 Message-ID regardless of the one we put
      // in the MIME. Read back the authoritative header so replies (whose
      // In-Reply-To references the *sent* id) reconcile to this message.
      let messageId = input.messageId;
      if (res.data.id) {
        try {
          const meta = await this.gmail().users.messages.get({
            userId: 'me',
            id: res.data.id,
            format: 'metadata',
            metadataHeaders: ['Message-Id'],
          });
          const header = meta.data.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === 'message-id',
          )?.value;
          if (header) messageId = header;
        } catch {
          // Non-fatal: fall back to the id we generated.
        }
      }

      return {
        messageId,
        providerMessageId: res.data.id ?? undefined,
        threadId: res.data.threadId ?? undefined,
      };
    } catch (error) {
      const { retryable, kind } = classifyGmailError(error);
      throw new EmailSendError('Gmail send failed', { retryable, kind, cause: error });
    }
  }

  async verify(): Promise<void> {
    // A cheap authenticated call that forces token validation/refresh.
    await this.gmail().users.getProfile({ userId: 'me' });
  }
}

/**
 * Map a Gmail API error to a retry decision + cause.
 *  - 401/403 → permanent auth problem (revoked/insufficient scope).
 *  - 400     → permanent bad request (e.g. malformed recipient).
 *  - 429/5xx → transient, retry.
 */
export function classifyGmailError(error: unknown): {
  retryable: boolean;
  kind: SendErrorKind;
} {
  const code = (error as { code?: number; status?: number })?.code;
  const status = (error as { status?: number })?.status ?? code;
  if (typeof status === 'number') {
    if (status === 401 || status === 403) return { retryable: false, kind: 'auth' };
    if (status === 400) return { retryable: false, kind: 'recipient' };
    if (status === 429 || status >= 500) return { retryable: true, kind: 'transient' };
  }
  return { retryable: true, kind: 'transient' };
}
