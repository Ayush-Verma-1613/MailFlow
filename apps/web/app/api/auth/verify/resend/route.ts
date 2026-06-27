import { connectToDatabase, User } from '@mailflow/db';
import { rateLimit } from '@mailflow/queue';
import { verifyResendSchema } from '@mailflow/shared';

import { clientIp, ok, parseBody, tooManyRequests } from '@/lib/api';
import { dispatchOtpEmail, generateOtp, generateVerificationToken } from '@/lib/verification';

/** Resend a verification email. Always responds generically (no account enumeration). */
export async function POST(req: Request) {
  const limited = await rateLimit(`verify-resend:${clientIp(req)}`, { limit: 5, windowSec: 3600 });
  if (!limited.allowed) {
    return tooManyRequests('Too many requests. Try again later.', limited.retryAfterMs);
  }

  const parsed = await parseBody(req, verifyResendSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await connectToDatabase();
    const user = await User.findOne({ email: parsed.data.email }).select('_id name emailVerified');
    if (user && !user.emailVerified) {
      const verify = generateVerificationToken();
      const otp = generateOtp();
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            verificationTokenHash: verify.hash,
            verificationTokenExpires: verify.expires,
            otpHash: otp.hash,
            otpExpires: otp.expires,
            otpAttempts: 0,
          },
        },
      );
      await dispatchOtpEmail(parsed.data.email, user.name ?? null, otp.raw, verify.raw);
    }
  } catch (error) {
    console.error('[verify/resend] error:', error);
  }

  // Generic regardless of whether the account exists or is already verified.
  return ok({ ok: true });
}
