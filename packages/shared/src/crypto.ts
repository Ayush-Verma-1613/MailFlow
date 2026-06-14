/**
 * Small server-side crypto helpers. SERVER-ONLY (node:crypto) — import via the
 * `@mailflow/shared/crypto` subpath, never from the package root, so client
 * bundles don't pull it in.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison that doesn't leak length or content via
 * timing. We hash both sides to a fixed 32 bytes first, so `timingSafeEqual`
 * (which throws on length mismatch) always gets equal-length buffers and the
 * comparison time is independent of where the inputs differ.
 */
export function safeStringEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

/** Hex SHA-256 digest of a string — e.g. to store a single-use token by hash. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
