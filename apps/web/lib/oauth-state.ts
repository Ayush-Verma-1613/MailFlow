import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

const STATE_COOKIE = 'mf_oauth_state';

/** Create a random CSRF state token and stash it in a short-lived cookie. */
export async function issueOAuthState(): Promise<string> {
  const state = randomBytes(24).toString('hex');
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });
  return state;
}

/** Validate the returned state against the cookie, then clear it. */
export async function consumeOAuthState(returned: string | null): Promise<boolean> {
  const jar = await cookies();
  const stored = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  return Boolean(returned && stored && returned === stored);
}
