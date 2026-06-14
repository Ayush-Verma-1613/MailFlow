/**
 * Public API key generation + verification.
 * Format: `mf_<prefix>_<secret>`. We store only a bcrypt hash + the non-secret
 * prefix (used to look the key up before the constant-time compare).
 */
import 'server-only';
import bcrypt from 'bcryptjs';
import { ApiKey } from '@mailflow/db';

import { randomToken } from './slug';

export interface GeneratedKey {
  raw: string; // shown to the user exactly once
  prefix: string;
  hashedKey: string;
}

export async function generateApiKey(): Promise<GeneratedKey> {
  const prefix = randomToken(4); // 8 hex chars
  const secret = randomToken(24);
  const raw = `mf_${prefix}_${secret}`;
  const hashedKey = await bcrypt.hash(raw, 12);
  return { raw, prefix, hashedKey };
}

export interface VerifiedKey {
  orgId: string;
  keyId: string;
  scopes: string[];
}

/** Verify a raw API key. Returns the org context or null. */
export async function verifyApiKey(raw: string | null): Promise<VerifiedKey | null> {
  if (!raw) return null;
  const match = /^mf_([a-f\d]+)_[a-f\d]+$/i.exec(raw.trim());
  if (!match) return null;
  const prefix = match[1];

  const key = await ApiKey.findOne({ prefix }).select('+hashedKey');
  if (!key) return null;

  const valid = await bcrypt.compare(raw.trim(), key.hashedKey);
  if (!valid) return null;

  // Best-effort usage timestamp.
  void ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).catch(
    () => undefined,
  );

  return { orgId: key.orgId.toString(), keyId: key._id.toString(), scopes: key.scopes };
}

/** A key satisfies a scope when it holds it explicitly or the wildcard `*`. */
export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes('*') || scopes.includes(required);
}
