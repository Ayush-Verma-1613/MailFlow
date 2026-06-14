import { createPrivateKey, createPublicKey } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { dkimDnsRecord, generateDkimKeyPair } from './dkim';

describe('generateDkimKeyPair', () => {
  it('produces a usable PKCS#8 PEM private key and base64 public key', () => {
    const { privateKeyPem, publicKeyBase64 } = generateDkimKeyPair();
    expect(privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
    // Both halves parse, and the public key derived from the private matches.
    expect(() => createPrivateKey(privateKeyPem)).not.toThrow();
    const fromDer = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const fromPriv = createPublicKey(createPrivateKey(privateKeyPem));
    expect(fromDer.export({ type: 'spki', format: 'pem' })).toBe(
      fromPriv.export({ type: 'spki', format: 'pem' }),
    );
  });
});

describe('dkimDnsRecord', () => {
  it('formats the TXT record at the selector subdomain', () => {
    const rec = dkimDnsRecord('mf-ab12', 'company.com', 'PUBKEY');
    expect(rec).toEqual({
      host: 'mf-ab12._domainkey.company.com',
      type: 'TXT',
      value: 'v=DKIM1; k=rsa; p=PUBKEY',
    });
  });
});
