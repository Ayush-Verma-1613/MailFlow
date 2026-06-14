/**
 * Transactional ("system") email — distinct from the per-org campaign senders.
 * Used for account lifecycle mail (e.g. address verification). Configured with
 * a single SMTP connection URL so it needs no per-account credential handling.
 */
import nodemailer from 'nodemailer';

export interface SystemEmailInput {
  /** nodemailer connection URL, e.g. `smtp://user:pass@host:587`. */
  smtpUrl: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Send one transactional email via the configured system SMTP connection. */
export async function sendSystemEmail(input: SystemEmailInput): Promise<void> {
  const transport = nodemailer.createTransport(input.smtpUrl);
  await transport.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
