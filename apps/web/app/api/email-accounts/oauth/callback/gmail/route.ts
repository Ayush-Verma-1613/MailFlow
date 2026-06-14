import { NextResponse } from 'next/server';
import { connectToDatabase, EmailAccount, encrypt } from '@mailflow/db';
import { exchangeCode } from '@mailflow/email';
import { DEFAULT_CAPS } from '@mailflow/shared';
import { env } from '@mailflow/shared/env';

import { auth } from '@/auth';
import { audit } from '@/lib/audit';
import { gmailOAuthConfig, registerWatchWithTokens } from '@/lib/email-account';
import { consumeOAuthState } from '@/lib/oauth-state';

function redirectToAccounts(params: Record<string, string>): NextResponse {
  const url = new URL('/dashboard/accounts', env.APP_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/** OAuth redirect target. Browser navigation, so we redirect (not JSON). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.orgId) {
    return NextResponse.redirect(new URL('/signin', env.APP_URL));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return redirectToAccounts({ error: 'cancelled' });
  if (!code) return redirectToAccounts({ error: 'missing_code' });
  if (!(await consumeOAuthState(state))) {
    return redirectToAccounts({ error: 'invalid_state' });
  }

  try {
    const tokens = await exchangeCode(gmailOAuthConfig(), code);
    await connectToDatabase();

    // Upsert by (org, email): re-connecting refreshes tokens in place.
    const update = {
      orgId: session.user.orgId,
      provider: 'gmail' as const,
      displayName: tokens.email,
      fromEmail: tokens.email,
      fromName: session.user.name ?? tokens.email,
      'auth.accessToken': encrypt(tokens.accessToken),
      ...(tokens.refreshToken
        ? { 'auth.refreshToken': encrypt(tokens.refreshToken) }
        : {}),
      'auth.expiresAt': tokens.expiresAt,
      'health.status': 'connected' as const,
      'health.lastError': undefined,
    };

    const account = await EmailAccount.findOneAndUpdate(
      { orgId: session.user.orgId, fromEmail: tokens.email },
      {
        $set: update,
        $setOnInsert: {
          limits: { ...DEFAULT_CAPS.gmail, warmupDay: 0 },
          'health.sentToday': 0,
          'health.bouncesToday': 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await audit({
      orgId: session.user.orgId,
      actorId: session.user.id,
      action: 'account.connect',
      target: { kind: 'EmailAccount', id: account?._id.toString() },
      meta: { provider: 'gmail', email: tokens.email },
    });

    // Best-effort: start receiving inbound mail (no-op without a Pub/Sub topic).
    if (account) {
      await registerWatchWithTokens(account._id.toString(), {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      }).catch((e) => console.error('[gmail watch] registration failed:', e));
    }

    return redirectToAccounts({ connected: tokens.email });
  } catch (error) {
    console.error('[oauth/callback/gmail] error:', error);
    return redirectToAccounts({ error: 'exchange_failed' });
  }
}
