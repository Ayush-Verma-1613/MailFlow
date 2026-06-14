/**
 * Gmail read-side helpers for the inbound pipeline: register a push watch,
 * pull message ids added since a history watermark, and fetch raw messages.
 * Like the provider, these take decrypted credentials + report token refreshes.
 */
import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';

import { createOAuthClient, type GoogleOAuthConfig } from './oauth/google';

export interface GmailAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface GmailClientOptions {
  oauth: GoogleOAuthConfig;
  credentials: GmailAuth;
  onTokensRefreshed?: (tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }) => void | Promise<void>;
}

function authedClient(opts: GmailClientOptions): OAuth2Client {
  const client = createOAuthClient(opts.oauth);
  client.setCredentials({
    access_token: opts.credentials.accessToken,
    refresh_token: opts.credentials.refreshToken,
    expiry_date: opts.credentials.expiresAt?.getTime(),
  });
  client.on('tokens', (t: Credentials) => {
    if (!t.access_token) return;
    void opts.onTokensRefreshed?.({
      accessToken: t.access_token,
      refreshToken: t.refresh_token ?? opts.credentials.refreshToken,
      expiresAt: t.expiry_date ? new Date(t.expiry_date) : undefined,
    });
  });
  return client;
}

/** Register (or refresh) a Gmail push watch on INBOX → Pub/Sub topic. */
export async function registerGmailWatch(
  opts: GmailClientOptions,
  topicName: string,
): Promise<{ historyId?: string; expiration?: Date }> {
  const gmail = google.gmail({ version: 'v1', auth: authedClient(opts) });
  const { data } = await gmail.users.watch({
    userId: 'me',
    requestBody: { topicName, labelIds: ['INBOX'], labelFilterBehavior: 'INCLUDE' },
  });
  return {
    historyId: data.historyId ?? undefined,
    expiration: data.expiration ? new Date(Number(data.expiration)) : undefined,
  };
}

/** Stop the Gmail watch (e.g. on disconnect). */
export async function stopGmailWatch(opts: GmailClientOptions): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: authedClient(opts) });
  await gmail.users.stop({ userId: 'me' });
}

/** Message ids added since the stored history id, plus the new watermark. */
export async function fetchHistory(
  opts: GmailClientOptions,
  startHistoryId: string,
): Promise<{ messageIds: string[]; historyId?: string }> {
  const gmail = google.gmail({ version: 'v1', auth: authedClient(opts) });
  const ids = new Set<string>();
  let pageToken: string | undefined;
  let latestHistoryId: string | undefined;

  do {
    const { data } = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      pageToken,
    });
    latestHistoryId = data.historyId ?? latestHistoryId;
    for (const h of data.history ?? []) {
      for (const m of h.messagesAdded ?? []) {
        if (m.message?.id) ids.add(m.message.id);
      }
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return { messageIds: [...ids], historyId: latestHistoryId };
}

/**
 * List recent INBOX message ids matching a Gmail search query. Used as a
 * fallback to the Pub/Sub push watch (e.g. local dev with no public webhook,
 * or a periodic reconciliation poll). `query` is Gmail search syntax.
 */
export async function listInboxMessageIds(
  opts: GmailClientOptions,
  query = 'newer_than:7d',
  max = 50,
): Promise<string[]> {
  const gmail = google.gmail({ version: 'v1', auth: authedClient(opts) });
  const { data } = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    labelIds: ['INBOX'],
    maxResults: max,
  });
  return (data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id));
}

/** Fetch a single message in raw RFC822 form. */
export async function getRawMessage(
  opts: GmailClientOptions,
  messageId: string,
): Promise<Buffer | null> {
  const gmail = google.gmail({ version: 'v1', auth: authedClient(opts) });
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'raw',
  });
  if (!data.raw) return null;
  return Buffer.from(data.raw, 'base64url');
}
