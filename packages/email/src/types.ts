import type { EmailProvider as ProviderKind } from '@mailflow/shared';

/** A single outbound message to render + send. */
export interface SendInput {
  to: string;
  from: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
  /** Explicit RFC822 Message-ID to assign (we generate one upstream so we can
   *  correlate replies). Format: `<token@domain>`. */
  messageId: string;
  /** Threading headers for replies. */
  inReplyTo?: string;
  references?: string[];
  /** Extra arbitrary headers (e.g. List-Unsubscribe). */
  headers?: Record<string, string>;
}

export interface SendResult {
  /** The RFC822 Message-ID actually used (echoes `SendInput.messageId`). */
  messageId: string;
  /** Provider-native id (Gmail message id, or SMTP accepted response). */
  providerMessageId?: string;
  /** Provider thread id, when available (Gmail). */
  threadId?: string;
}

/** Uniform interface every sending backend implements. */
export interface EmailProvider {
  readonly kind: ProviderKind;
  /** Send one message. Throws {@link EmailSendError} on failure. */
  send(input: SendInput): Promise<SendResult>;
  /** Lightweight connectivity/auth check (used by "Send test" + health). */
  verify(): Promise<void>;
}

/**
 * Why a send failed, used to decide the consequence:
 *  - `recipient`  — the address is bad (hard bounce). Suppress the contact;
 *                   the mailbox is fine.
 *  - `auth`       — the account's credentials/permissions are broken. Mark the
 *                   account unhealthy; the address may be fine.
 *  - `transient`  — temporary (network, 4xx, rate). Safe to retry.
 */
export type SendErrorKind = 'recipient' | 'auth' | 'transient';

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly options: { retryable: boolean; kind?: SendErrorKind; cause?: unknown } = {
      retryable: true,
    },
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}
