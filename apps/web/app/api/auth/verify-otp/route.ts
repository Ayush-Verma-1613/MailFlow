import { connectToDatabase, User } from '@mailflow/db';
import { rateLimit } from '@mailflow/queue';
import { verifyOtpSchema } from '@mailflow/shared';

import { badRequest, clientIp, ok, parseBody, tooManyRequests } from '@/lib/api';
import { hashOtp } from '@/lib/verification';

const MAX_OTP_ATTEMPTS = 5;

/** Verify a signup OTP. Marks the email verified on success. */
export async function POST(req: Request) {
  // Network-level throttle to blunt distributed code-guessing.
  const limited = await rateLimit(`verify-otp:${clientIp(req)}`, { limit: 10, windowSec: 600 });
  if (!limited.allowed) {
    return tooManyRequests('Too many attempts. Try again later.', limited.retryAfterMs);
  }

  const parsed = await parseBody(req, verifyOtpSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await connectToDatabase();
    const user = await User.findOne({ email: parsed.data.email }).select(
      '+otpHash +otpAttempts emailVerified otpExpires',
    );

    // Generic failure for all the "can't verify" cases (no enumeration).
    if (!user || user.emailVerified) {
      return badRequest('Invalid or expired code');
    }
    if (!user.otpHash || !user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return badRequest('Invalid or expired code');
    }
    // Per-account attempt cap: burns the code after too many wrong guesses.
    if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      await User.updateOne({ _id: user._id }, { $unset: { otpHash: '', otpExpires: '' } });
      return badRequest('Too many incorrect attempts. Request a new code.');
    }

    if (hashOtp(parsed.data.code) !== user.otpHash) {
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
      return badRequest('Invalid or expired code');
    }

    // Success: verify the email and clear both verification mechanisms.
    await User.updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: new Date() },
        $unset: {
          otpHash: '',
          otpExpires: '',
          otpAttempts: '',
          verificationTokenHash: '',
          verificationTokenExpires: '',
        },
      },
    );
    return ok({ ok: true });
  } catch (error) {
    console.error('[verify-otp] error:', error);
    return badRequest('Invalid or expired code');
  }
}
