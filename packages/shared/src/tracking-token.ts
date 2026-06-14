/**
 * Opaque, tamper-proof tracking ids. Open/click URLs must not expose a raw,
 * enumerable recipient ObjectId (an attacker could forge events for other
 * orgs' recipients). We append a short HMAC so the routes can recover the id
 * only if the token was minted by us.
 *
 * SERVER-ONLY (node:crypto) — import via `@mailflow/shared/tracking-token`.
 */
import { createHmac } from 'node:crypto';

import { safeStringEqual } from './crypto';
import { env } from './env';

const SIG_LEN = 24; // base64url chars of the HMAC — ~144 bits, plenty here.

function sign(id: string, secret: string): string {
  return createHmac('sha256', secret).update(id).digest('base64url').slice(0, SIG_LEN);
}

/** Mint `<id>.<sig>` using an explicit secret (env-free; for tests). */
export function signTrackingIdWith(id: string, secret: string): string {
  return `${id}.${sign(id, secret)}`;
}

/** Recover the id from a token using an explicit secret, or `null` if invalid. */
export function verifyTrackingTokenWith(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  return safeStringEqual(sig, sign(id, secret)) ? id : null;
}

/** Mint a tracking token signed with AUTH_SECRET. */
export function signTrackingId(id: string): string {
  return signTrackingIdWith(id, env.AUTH_SECRET);
}

/** Recover the recipient id from a tracking token, or `null` if tampered/forged. */
export function verifyTrackingToken(token: string): string | null {
  return verifyTrackingTokenWith(token, env.AUTH_SECRET);
}
