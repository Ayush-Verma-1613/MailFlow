/**
 * AES-256-GCM encryption for secrets stored at rest (OAuth tokens, SMTP
 * passwords, provider API keys). The key comes from `ENCRYPTION_KEY` — a
 * base64-encoded 32-byte value.
 *
 * Wire format (string, colon-separated, all base64):  iv:authTag:ciphertext
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import { env } from '@mailflow/shared/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM
const KEY_LENGTH = 32; // 256-bit key

let keyCache: Buffer | null = null;

function getKey(): Buffer {
  if (keyCache) return keyCache;
  const key = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). ` +
        'Generate one with: openssl rand -base64 32',
    );
  }
  keyCache = key;
  return key;
}

/** Encrypt a plaintext string. Returns `iv:tag:ciphertext` (base64 parts). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(
    ':',
  );
}

/** Decrypt a value previously produced by {@link encrypt}. */
export function decrypt(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed ciphertext payload');
  }
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Encrypt only when a value is present (helper for optional fields). */
export function encryptMaybe(value?: string | null): string | undefined {
  return value ? encrypt(value) : undefined;
}
