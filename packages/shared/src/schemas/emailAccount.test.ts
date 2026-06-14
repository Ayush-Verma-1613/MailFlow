import { describe, expect, it } from 'vitest';

import { smtpConnectSchema } from './emailAccount';

const base = {
  displayName: 'Sales',
  fromName: 'Ada',
  fromEmail: 'ada@company.com',
  host: 'smtp.company.com',
  port: 587,
  user: 'ada',
  pass: 'secret',
};

const PEM = '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----';

describe('smtpConnectSchema DKIM rules', () => {
  it('accepts a connection with no DKIM fields', () => {
    expect(smtpConnectSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a matching selector + PEM key', () => {
    const r = smtpConnectSchema.safeParse({
      ...base,
      dkimSelector: 'mailflow',
      dkimPrivateKey: PEM,
    });
    expect(r.success).toBe(true);
  });

  it('rejects a selector without a key (and vice versa)', () => {
    expect(smtpConnectSchema.safeParse({ ...base, dkimSelector: 'mailflow' }).success).toBe(false);
    expect(smtpConnectSchema.safeParse({ ...base, dkimPrivateKey: PEM }).success).toBe(false);
  });

  it('rejects a non-PEM private key', () => {
    const r = smtpConnectSchema.safeParse({
      ...base,
      dkimSelector: 'mailflow',
      dkimPrivateKey: 'not-a-key',
    });
    expect(r.success).toBe(false);
  });
});
