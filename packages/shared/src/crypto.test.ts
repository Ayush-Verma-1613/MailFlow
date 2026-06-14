import { describe, expect, it } from 'vitest';

import { safeStringEqual, sha256Hex } from './crypto';

describe('safeStringEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeStringEqual('s3cret-token', 's3cret-token')).toBe(true);
    expect(safeStringEqual('', '')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(safeStringEqual('s3cret-token', 's3cret-toker')).toBe(false);
    expect(safeStringEqual('token', 'TOKEN')).toBe(false);
  });

  it('returns false for different-length strings without throwing', () => {
    expect(safeStringEqual('short', 'a-much-longer-value')).toBe(false);
    expect(safeStringEqual('value', '')).toBe(false);
  });
});

describe('sha256Hex', () => {
  it('produces the known 64-char hex digest', () => {
    // Well-known SHA-256("abc").
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic and differs for different inputs', () => {
    expect(sha256Hex('token')).toBe(sha256Hex('token'));
    expect(sha256Hex('token')).not.toBe(sha256Hex('Token'));
  });
});
