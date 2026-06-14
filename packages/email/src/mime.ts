import { randomBytes } from 'node:crypto';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import type Mail from 'nodemailer/lib/mailer/index.js';
import type { SendInput } from './types';

/** Generate an RFC822 Message-ID of the form `<token@domain>`. */
export function generateMessageId(fromEmail: string): string {
  const domain = fromEmail.split('@')[1] ?? 'mailflow.local';
  return `<${randomBytes(16).toString('hex')}@${domain}>`;
}

/** Map a {@link SendInput} to nodemailer's mail options (shared by providers). */
export function toMailOptions(input: SendInput): Mail.Options {
  return {
    from: input.from.name
      ? { name: input.from.name, address: input.from.email }
      : input.from.email,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    messageId: input.messageId,
    inReplyTo: input.inReplyTo,
    references: input.references,
    headers: input.headers,
  };
}

/** Build a raw RFC822 MIME message buffer from a {@link SendInput}. */
export async function buildRawMime(input: SendInput): Promise<Buffer> {
  const composer = new MailComposer(toMailOptions(input));
  return composer.compile().build();
}
