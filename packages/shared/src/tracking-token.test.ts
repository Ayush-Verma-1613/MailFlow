import { describe, expect, it } from 'vitest';

import { signTrackingIdWith, verifyTrackingTokenWith } from './tracking-token';

const SECRET = 'test-secret-at-least-16-chars';
const ID = '507f1f77bcf86cd799439011';

describe('tracking tokens', () => {
  it('round-trips a signed id', () => {
    const token = signTrackingIdWith(ID, SECRET);
    expect(token.startsWith(`${ID}.`)).toBe(true);
    expect(verifyTrackingTokenWith(token, SECRET)).toBe(ID);
  });

  it('rejects a tampered id', () => {
    const token = signTrackingIdWith(ID, SECRET);
    const tampered = token.replace(ID, '507f1f77bcf86cd799439012');
    expect(verifyTrackingTokenWith(tampered, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signTrackingIdWith(ID, SECRET);
    expect(verifyTrackingTokenWith(token, 'another-secret-16chars')).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyTrackingTokenWith(ID, SECRET)).toBeNull(); // no signature
    expect(verifyTrackingTokenWith(`${ID}.`, SECRET)).toBeNull(); // empty signature
    expect(verifyTrackingTokenWith('', SECRET)).toBeNull();
  });
});
