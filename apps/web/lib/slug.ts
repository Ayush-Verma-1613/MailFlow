import { randomBytes } from 'node:crypto';

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\da-z]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** A short random token (hex) for unsubscribe links, slug suffixes, etc. */
export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}
