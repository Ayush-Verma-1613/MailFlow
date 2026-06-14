/**
 * Inject open-tracking pixel, rewrite links for click tracking, and append the
 * unsubscribe footer. All URLs point at the web app's public webhook routes.
 */
import { TRACKING_CLICK_PATH, TRACKING_PIXEL_PATH, UNSUBSCRIBE_PATH } from '@mailflow/shared';
import { env } from '@mailflow/shared/env';
import { signTrackingId } from '@mailflow/shared/tracking-token';

const HREF_RE = /href\s*=\s*"(https?:\/\/[^"]+)"/gi;

export interface TrackingContext {
  recipientId: string;
  unsubscribeToken: string;
  unsubscribeFooter?: string;
}

/** Rewrite `http(s)` links to pass through the click-tracking redirect. */
function rewriteLinks(html: string, token: string): string {
  const base = `${env.APP_URL}${TRACKING_CLICK_PATH}/${token}`;
  return html.replace(HREF_RE, (_m, url: string) => {
    // Don't wrap the unsubscribe link.
    if (url.includes(UNSUBSCRIBE_PATH)) return `href="${url}"`;
    return `href="${base}?u=${encodeURIComponent(url)}"`;
  });
}

function pixel(token: string): string {
  const src = `${env.APP_URL}${TRACKING_PIXEL_PATH}/${token}.png`;
  return `<img src="${src}" width="1" height="1" alt="" style="display:none"/>`;
}

function footer(token: string, custom?: string): string {
  const link = `${env.APP_URL}${UNSUBSCRIBE_PATH}/${token}`;
  const text = custom ?? 'You received this email as part of an outreach campaign.';
  return `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
${text} <a href="${link}" style="color:#64748b">Unsubscribe</a>.
</div>`;
}

/** Apply all tracking transforms to a rendered HTML body. */
export function applyTracking(html: string, ctx: TrackingContext): string {
  // Sign the recipient id so the open/click URLs aren't enumerable/forgeable.
  const token = signTrackingId(ctx.recipientId);
  const tracked = rewriteLinks(html, token);
  return `${tracked}\n${footer(ctx.unsubscribeToken, ctx.unsubscribeFooter)}\n${pixel(token)}`;
}
