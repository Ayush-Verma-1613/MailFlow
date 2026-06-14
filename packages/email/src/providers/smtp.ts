import nodemailer, { type Transporter } from 'nodemailer';

import { toMailOptions } from '../mime';
import {
  EmailSendError,
  type EmailProvider,
  type SendErrorKind,
  type SendInput,
  type SendResult,
} from '../types';

export interface SmtpDkimConfig {
  /** Signing domain (`d=`), e.g. `company.com`. */
  domainName: string;
  /** DNS selector (`s=`), e.g. `mailflow` → `mailflow._domainkey.company.com`. */
  keySelector: string;
  /** PEM-encoded RSA private key (already decrypted). */
  privateKey: string;
}

export interface SmtpCredentials {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  /** When present, outbound mail is DKIM-signed by nodemailer. */
  dkim?: SmtpDkimConfig;
}

export class SmtpProvider implements EmailProvider {
  readonly kind = 'smtp' as const;
  private readonly transporter: Transporter;

  constructor(creds: SmtpCredentials) {
    this.transporter = nodemailer.createTransport({
      host: creds.host,
      port: creds.port,
      // `secure` true for 465; STARTTLS upgrade for 587 etc.
      secure: creds.secure,
      auth: { user: creds.user, pass: creds.pass },
      // DKIM-sign every message when a key is configured. Authenticated SMTP
      // from cold domains is throttled/rejected without a valid signature.
      ...(creds.dkim && { dkim: creds.dkim }),
    });
  }

  async send(input: SendInput): Promise<SendResult> {
    try {
      const info = await this.transporter.sendMail(toMailOptions(input));
      return {
        messageId: info.messageId || input.messageId,
        providerMessageId: info.response,
      };
    } catch (error) {
      const { retryable, kind } = classifySmtpError(error);
      throw new EmailSendError('SMTP send failed', { retryable, kind, cause: error });
    }
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }
}

/**
 * Map an SMTP error to a retry decision + cause.
 *  - 4xx (or no response code, e.g. a connection error) → transient, retry.
 *  - 530/535 (auth required / auth failed) → permanent auth problem.
 *  - other 5xx (550 user unknown, 553 bad address, …) → permanent hard bounce.
 */
export function classifySmtpError(error: unknown): {
  retryable: boolean;
  kind: SendErrorKind;
} {
  const code = (error as { responseCode?: number })?.responseCode;
  if (typeof code !== 'number' || code < 500) return { retryable: true, kind: 'transient' };
  if (code === 530 || code === 535) return { retryable: false, kind: 'auth' };
  return { retryable: false, kind: 'recipient' };
}
