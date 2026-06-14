import { signUpSchema } from '@mailflow/shared';
import { connectToDatabase } from '@mailflow/db';
import { rateLimit } from '@mailflow/queue';

import { clientIp, conflict, ok, parseBody, serverError, tooManyRequests } from '@/lib/api';
import { createUserWithOrg } from '@/lib/auth-service';
import { dispatchVerificationEmail } from '@/lib/verification';

/** Public registration: creates a user and their org. */
export async function POST(req: Request) {
  // Cap signups per IP to curb automated account creation.
  const limited = await rateLimit(`signup:${clientIp(req)}`, { limit: 5, windowSec: 3600 });
  if (!limited.allowed) {
    return tooManyRequests(
      'Too many signups from this network. Try again later.',
      limited.retryAfterMs,
    );
  }

  const parsed = await parseBody(req, signUpSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await connectToDatabase();
    const user = await createUserWithOrg(parsed.data);
    // Email the verification link (logged when no system SMTP is configured).
    if (user.verificationToken) {
      await dispatchVerificationEmail(user.email, user.name, user.verificationToken);
    }
    return ok(
      {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        verificationRequired: !user.emailVerified,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
      return conflict('An account with that email already exists');
    }
    console.error('[signup] error:', error);
    return serverError('Could not create account');
  }
}
