import { connectToDatabase, Contact } from '@mailflow/db';

/** Apply the unsubscribe. Idempotent; never throws. Returns a status message. */
async function unsubscribe(token: string): Promise<string> {
  if (!token) return 'This unsubscribe link is invalid or has expired.';
  try {
    await connectToDatabase();
    const contact = await Contact.findOneAndUpdate(
      { unsubscribeToken: token },
      { $set: { status: 'unsubscribed' } },
    );
    return contact
      ? 'You have been unsubscribed. You will no longer receive these emails.'
      : 'This unsubscribe link is invalid or has expired.';
  } catch (error) {
    console.error('[unsubscribe] error:', error);
    return 'Something went wrong. Please try again later.';
  }
}

/** Public, token-based unsubscribe (link click). Idempotent friendly page. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const message = await unsubscribe(token);
  return new Response(unsubscribePage(message), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * RFC 8058 one-click unsubscribe: the mail client POSTs here (body
 * `List-Unsubscribe=One-Click`) when the user hits the native unsubscribe
 * button. No body parsing needed — the token in the URL is the authorization.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  await unsubscribe(token);
  return new Response(null, { status: 200 });
}

function unsubscribePage(message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Unsubscribe · MailFlow</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;background:#F4F1E9;color:#1B1814;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#FBF9F2;border:1px solid #E2DBCB;border-radius:14px;padding:48px;max-width:420px;text-align:center}
  h1{font-size:26px;font-weight:400;margin:0 0 10px;letter-spacing:-0.01em}
  p{font-family:system-ui,-apple-system,sans-serif;color:#6E665B;margin:0;line-height:1.55;font-size:14px}
  .brand{font-size:22px;margin-bottom:24px;letter-spacing:-0.02em} .brand em{font-style:italic;color:#B65A3E}
</style></head>
<body><div class="card"><div class="brand">Mail<em>flow</em></div>
<h1>Unsubscribed</h1><p>${message}</p></div></body></html>`;
}
