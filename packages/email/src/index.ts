/**
 * @mailflow/email — provider-agnostic sending. Each backend (Gmail, SMTP, …)
 * implements the {@link EmailProvider} interface. Callers pass already-decrypted
 * credentials; secret storage/decryption lives in the app layer (@mailflow/db).
 */
export * from './types';
export { generateMessageId, buildRawMime, toMailOptions } from './mime';
export * from './providers/index';
export {
  resolveProvider,
  type StoredAccount,
  type StoredAuth,
  type ResolveOptions,
} from './resolve';
export {
  GMAIL_SCOPES,
  buildConsentUrl,
  createOAuthClient,
  exchangeCode,
  type GoogleOAuthConfig,
  type ExchangedTokens,
} from './oauth/google';
export { parseRawEmail, normalizeSubject, type ParsedEmail } from './parser';
export { parseBounce, type BounceReport } from './bounce';
export { sendSystemEmail, type SystemEmailInput } from './system';
export { generateDkimKeyPair, dkimDnsRecord, type DkimKeyPair, type DkimDnsRecord } from './dkim';
export {
  registerGmailWatch,
  stopGmailWatch,
  fetchHistory,
  listInboxMessageIds,
  getRawMessage,
  type GmailAuth,
  type GmailClientOptions,
} from './gmail-inbound';
