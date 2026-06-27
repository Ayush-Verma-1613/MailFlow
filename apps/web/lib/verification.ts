/**
 * Email-verification token lifecycle + delivery. Tokens are random and stored
 * only as a SHA-256 hash; the raw value lives only in the emailed link. When no
 * system SMTP is configured the link is logged instead (dev / no-infra mode).
 */
import 'server-only';
import { randomBytes, randomInt } from 'node:crypto';
import { sendSystemEmail } from '@mailflow/email';
import { sha256Hex } from '@mailflow/shared/crypto';
import { env } from '@mailflow/shared/env';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const OTP_TTL_MS = 10 * 60 * 1000; // 10m — short window since a 6-digit code is low-entropy

export interface VerificationToken {
  /** Raw token for the link (never stored). */
  raw: string;
  /** SHA-256 of the raw token (stored on the user). */
  hash: string;
  expires: Date;
}

export function generateVerificationToken(): VerificationToken {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: sha256Hex(raw), expires: new Date(Date.now() + TOKEN_TTL_MS) };
}

export function hashVerificationToken(raw: string): string {
  return sha256Hex(raw);
}

/** Generate a 6-digit numeric OTP. Stored only as a SHA-256 hash, like the link token. */
export function generateOtp(): VerificationToken {
  // randomInt is uniform & crypto-strong; pad so codes like "004271" keep 6 digits.
  const raw = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return { raw, hash: sha256Hex(raw), expires: new Date(Date.now() + OTP_TTL_MS) };
}

export function hashOtp(raw: string): string {
  return sha256Hex(raw);
}

export function verificationUrl(rawToken: string): string {
  return `${env.APP_URL}/api/auth/verify/${rawToken}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Email the verification link, or log it when no system SMTP is configured. */
export async function dispatchVerificationEmail(
  to: string,
  name: string | null,
  rawToken: string,
): Promise<void> {
  const url = verificationUrl(rawToken);

  if (env.SYSTEM_SMTP_URL && env.SYSTEM_EMAIL_FROM) {
    try {
      await sendSystemEmail({
        smtpUrl: env.SYSTEM_SMTP_URL,
        from: env.SYSTEM_EMAIL_FROM,
        to,
        subject: 'Verify your MailFlow email',
        html: `<p>Hi ${escapeHtml(name ?? 'there')},</p>
<p>Confirm your email to activate your MailFlow account:</p>
<p><a href="${url}">Verify my email</a></p>
<p>This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`,
        text: `Verify your MailFlow email: ${url}\nThis link expires in 24 hours.`,
      });
      return;
    } catch (error) {
      console.error('[verification] send failed:', error);
      // Fall through so the link is at least recoverable from logs.
    }
  }
  console.info(`[verification] link for ${to}: ${url}`);
}

/**
 * Email a 6-digit OTP code, with the verification link as a fallback so both
 * paths work. Falls back to logging when no system SMTP is configured.
 */
export async function dispatchOtpEmail(
  to: string,
  name: string | null,
  code: string,
  linkRawToken?: string,
): Promise<void> {
  const url = linkRawToken ? verificationUrl(linkRawToken) : null;
  const linkHtml = url
    ? `<p>Or click to verify instead: <a href="${url}">Verify my email</a></p>`
    : '';
  const linkText = url ? `\nOr verify via link: ${url}` : '';

  if (env.SYSTEM_SMTP_URL && env.SYSTEM_EMAIL_FROM) {
    try {
      await sendSystemEmail({
        smtpUrl: env.SYSTEM_SMTP_URL,
        from: env.SYSTEM_EMAIL_FROM,
        to,
        subject: `${code} is your MailFlow verification code`,
        html: `<p>Hi ${escapeHtml(name ?? 'there')},</p>
<p>Your MailFlow verification code is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
<p>This code expires in 10 minutes. If you didn't create an account, ignore this email.</p>
${linkHtml}`,
        text: `Your MailFlow verification code is: ${code}\nThis code expires in 10 minutes.${linkText}`,
      });
      return;
    } catch (error) {
      console.error('[verification] OTP send failed:', error);
      // Fall through so the code is at least recoverable from logs.
    }
  }
  console.info(`[verification] OTP for ${to}: ${code}`);
}
