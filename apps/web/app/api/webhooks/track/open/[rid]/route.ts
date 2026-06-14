import { connectToDatabase } from '@mailflow/db';
import { rateLimit } from '@mailflow/queue';
import { verifyTrackingToken } from '@mailflow/shared/tracking-token';
import { clientIp } from '@/lib/api';
import { recordRecipientEvent } from '@/lib/tracking-events';

// 1x1 transparent PNG.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function pixelResponse(): Response {
  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Content-Length': String(PIXEL.length),
    },
  });
}

/** Open-tracking pixel. `rid` is `<signed-token>.png`. Always returns the pixel. */
export async function GET(req: Request, ctx: { params: Promise<{ rid: string }> }) {
  const { rid } = await ctx.params;
  // `rid` is an HMAC-signed token; recover the recipient id only if it's valid.
  const recipientId = verifyTrackingToken(rid?.replace(/\.png$/i, '') ?? '');
  if (recipientId) {
    try {
      // Throttle per IP to blunt enumeration of recipient ids. A high cap still
      // tolerates many real opens behind one corporate NAT; over-limit requests
      // simply skip the DB write — the pixel is always returned.
      const limited = await rateLimit(`track:${clientIp(req)}`, { limit: 240, windowSec: 60 });
      if (limited.allowed) {
        await connectToDatabase();
        await recordRecipientEvent(recipientId, 'open');
      }
    } catch {
      // Never let tracking failures break the pixel.
    }
  }
  return pixelResponse();
}
