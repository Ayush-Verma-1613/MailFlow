import { describe, expect, it, vi } from 'vitest';

import { buildSmtpDkim, type StoredAuth } from './resolve';

const baseAuth: StoredAuth = {
  host: 'smtp.company.com',
  port: 587,
  user: 'ada',
  pass: 'enc:pass',
};

describe('buildSmtpDkim', () => {
  it('returns a signing config when key, selector, and domain are all present', () => {
    const decrypt = vi.fn((c: string) => c.replace('enc:', ''));
    const dkim = buildSmtpDkim(
      { ...baseAuth, dkimPrivateKey: 'enc:PEMKEY', dkimSelector: 'mailflow' },
      'ada@company.com',
      decrypt,
    );
    expect(dkim).toEqual({
      domainName: 'company.com',
      keySelector: 'mailflow',
      privateKey: 'PEMKEY',
    });
    // The stored key is decrypted exactly once, on demand.
    expect(decrypt).toHaveBeenCalledWith('enc:PEMKEY');
  });

  it('returns undefined (and never decrypts) when DKIM is not configured', () => {
    const decrypt = vi.fn();
    expect(buildSmtpDkim(baseAuth, 'ada@company.com', decrypt)).toBeUndefined();
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('returns undefined when only one of key/selector is set', () => {
    const decrypt = vi.fn();
    expect(
      buildSmtpDkim({ ...baseAuth, dkimPrivateKey: 'enc:PEMKEY' }, 'ada@company.com', decrypt),
    ).toBeUndefined();
    expect(
      buildSmtpDkim({ ...baseAuth, dkimSelector: 'mailflow' }, 'ada@company.com', decrypt),
    ).toBeUndefined();
  });

  it('returns undefined when the domain cannot be derived from fromEmail', () => {
    const decrypt = vi.fn();
    expect(
      buildSmtpDkim(
        { ...baseAuth, dkimPrivateKey: 'enc:PEMKEY', dkimSelector: 'mailflow' },
        undefined,
        decrypt,
      ),
    ).toBeUndefined();
  });
});
