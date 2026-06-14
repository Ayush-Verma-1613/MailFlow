/**
 * Managed DKIM keypair generation. We mint the RSA keypair, hand the caller the
 * PEM private key (to encrypt + store and feed to nodemailer) and the public key
 * formatted for a DNS TXT record the user publishes.
 *
 * SERVER-ONLY (node:crypto).
 */
import { generateKeyPairSync } from 'node:crypto';

export interface DkimKeyPair {
  /** PKCS#8 PEM — store encrypted; pass to nodemailer's dkim option. */
  privateKeyPem: string;
  /** Base64 SPKI DER — the `p=` value of the DNS record. */
  publicKeyBase64: string;
}

export interface DkimDnsRecord {
  host: string;
  type: 'TXT';
  value: string;
}

/** Generate a 2048-bit RSA keypair for DKIM signing. */
export function generateDkimKeyPair(): DkimKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  });
  return {
    privateKeyPem: privateKey,
    publicKeyBase64: Buffer.from(publicKey).toString('base64'),
  };
}

/** Build the DNS TXT record the user publishes at `<selector>._domainkey.<domain>`. */
export function dkimDnsRecord(
  selector: string,
  domain: string,
  publicKeyBase64: string,
): DkimDnsRecord {
  return {
    host: `${selector}._domainkey.${domain}`,
    type: 'TXT',
    value: `v=DKIM1; k=rsa; p=${publicKeyBase64}`,
  };
}
