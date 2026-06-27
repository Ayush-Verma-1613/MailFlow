import { connectToDatabase, User } from '@mailflow/db';

import { hashVerificationToken } from '@/lib/verification';

/** Email-verification link target. Marks the email verified, then shows a page. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let title = 'Email verified';
  let message = 'Your email is confirmed. You can now sign in to MailFlow.';

  if (!token) {
    title = 'Invalid link';
    message = 'This verification link is invalid.';
  } else {
    try {
      await connectToDatabase();
      const res = await User.updateOne(
        {
          verificationTokenHash: hashVerificationToken(token),
          verificationTokenExpires: { $gt: new Date() },
        },
        {
          $set: { emailVerified: new Date() },
          $unset: {
            verificationTokenHash: '',
            verificationTokenExpires: '',
            otpHash: '',
            otpExpires: '',
            otpAttempts: '',
          },
        },
      );
      if (res.modifiedCount === 0) {
        title = 'Link expired';
        message =
          'This verification link is invalid or has already been used. Request a new one from the sign-in page.';
      }
    } catch (error) {
      console.error('[verify] error:', error);
      title = 'Something went wrong';
      message = 'Please try again later.';
    }
  }

  return new Response(page(title, message), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function page(title: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} · MailFlow</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;background:#F4F1E9;color:#1B1814;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#FBF9F2;border:1px solid #E2DBCB;border-radius:14px;padding:48px;max-width:420px;text-align:center}
  h1{font-size:26px;font-weight:400;margin:0 0 10px;letter-spacing:-0.01em}
  p{font-family:system-ui,-apple-system,sans-serif;color:#6E665B;margin:0 0 20px;line-height:1.55;font-size:14px}
  a{font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#B65A3E;text-decoration:none}
  .brand{font-size:22px;margin-bottom:24px;letter-spacing:-0.02em} .brand em{font-style:italic;color:#B65A3E}
</style></head>
<body><div class="card"><div class="brand">Mail<em>flow</em></div>
<h1>${title}</h1><p>${message}</p><a href="/signin">Go to sign in →</a></div></body></html>`;
}
