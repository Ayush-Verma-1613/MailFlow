/**
 * Pure send-time helpers (kept out of the worker so they're unit-testable):
 * the public unsubscribe URL, an HTML→text fallback for the plain-text part,
 * and the warmup ramp for a new mailbox's daily cap.
 */
import { UNSUBSCRIBE_PATH } from '@mailflow/shared';
import { env } from '@mailflow/shared/env';

const DAY_MS = 86_400_000;

/** Public, token-based unsubscribe URL (also used for the List-Unsubscribe header). */
export function unsubscribeUrl(token: string): string {
  return `${env.APP_URL}${UNSUBSCRIBE_PATH}/${token}`;
}

/** Best-effort HTML→text so outbound mail isn't HTML-only (helps deliverability). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Plain-text alternative: the rendered body plus an unsubscribe line. */
export function buildPlainText(renderedBodyHtml: string, unsubUrl: string): string {
  return `${htmlToText(renderedBodyHtml)}\n\n—\nUnsubscribe: ${unsubUrl}`;
}

/** Headers every campaign send should carry (RFC 8058 one-click unsubscribe). */
export function unsubscribeHeaders(unsubUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Ramp the daily cap for a warming mailbox. `warmupDay` is the number of days
 * over which to reach the full cap; 0/undefined disables warmup (full cap).
 * Age 0 (day 1) allows ~dailyCap/warmupDay; linear up to dailyCap at warmupDay.
 */
export function effectiveDailyCap(opts: {
  dailyCap: number;
  warmupDay?: number;
  createdAt?: Date;
  now?: Date;
}): number {
  const { dailyCap, warmupDay } = opts;
  if (!warmupDay || warmupDay <= 0) return dailyCap;
  const now = opts.now?.getTime() ?? Date.now();
  const created = opts.createdAt?.getTime() ?? now;
  const ageDays = Math.max(0, Math.floor((now - created) / DAY_MS));
  if (ageDays >= warmupDay) return dailyCap;
  const ramped = Math.round((dailyCap * (ageDays + 1)) / warmupDay);
  const floor = Math.min(dailyCap, 10);
  return Math.min(dailyCap, Math.max(floor, ramped));
}
