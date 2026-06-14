import { NextResponse } from 'next/server';
import { CampaignRecipient, connectToDatabase } from '@mailflow/db';
import { enqueue, rateLimit } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';
import { env } from '@mailflow/shared/env';
import { verifyTrackingToken } from '@mailflow/shared/tracking-token';
import { clientIp } from '@/lib/api';
import { recordRecipientEvent } from '@/lib/tracking-events';

/** Click-tracking redirect. Records the click then 302s to the original URL. */
export async function GET(req: Request, ctx: { params: Promise<{ rid: string }> }) {
  const { rid } = await ctx.params;
  const target = new URL(req.url).searchParams.get('u');

  // Only allow http(s) targets — never an open redirect to javascript:, etc.
  let safeTarget: string | null = null;
  if (target) {
    try {
      const parsed = new URL(target);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeTarget = parsed.toString();
      }
    } catch {
      safeTarget = null;
    }
  }

  // `rid` is an HMAC-signed token; recover the recipient id only if valid.
  const recipientId = verifyTrackingToken(rid ?? '');
  if (recipientId) {
    try {
      // Throttle per IP to blunt id enumeration / workflow-trigger spam. Over
      // the cap we skip recording but still redirect the user.
      const limited = await rateLimit(`track:${clientIp(req)}`, { limit: 240, windowSec: 60 });
      if (limited.allowed) {
        await connectToDatabase();
        await recordRecipientEvent(
          recipientId,
          'click',
          safeTarget ? { url: safeTarget } : undefined,
        );
        // Fire the link_clicked event for the workflow engine.
        const recipient = await CampaignRecipient.findById(recipientId).select('orgId').lean();
        if (recipient) {
          await enqueue(QUEUE_NAMES.workflowRun, {
            orgId: recipient.orgId.toString(),
            event: 'link_clicked',
            contextRef: { kind: 'CampaignRecipient', id: recipientId },
          });
        }
      }
    } catch {
      // Tracking must never block the redirect.
    }
  }

  return NextResponse.redirect(safeTarget ?? env.APP_URL);
}
