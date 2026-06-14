import { describe, expect, it } from 'vitest';

import { parseBounce } from './bounce';

function dsn(status: string): string {
  return [
    'From: Mail Delivery Subsystem <MAILER-DAEMON@gmail.com>',
    'To: sender@ourdomain.com',
    'Subject: Delivery Status Notification (Failure)',
    'MIME-Version: 1.0',
    'Content-Type: multipart/report; report-type=delivery-status; boundary="b"',
    '',
    '--b',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'Delivery to the following recipient failed permanently: bob@example.com',
    '',
    '--b',
    'Content-Type: message/delivery-status',
    '',
    'Reporting-MTA: dns; gmail.com',
    '',
    'Final-Recipient: rfc822; bob@example.com',
    'Action: failed',
    `Status: ${status}`,
    'Diagnostic-Code: smtp; 550 5.1.1 The email account does not exist.',
    '',
    '--b--',
    '',
  ].join('\r\n');
}

describe('parseBounce', () => {
  it('detects a permanent (5.x) bounce and extracts the failed recipient', async () => {
    const report = await parseBounce(dsn('5.1.1'));
    expect(report).not.toBeNull();
    expect(report?.recipients).toEqual(['bob@example.com']);
    expect(report?.permanent).toBe(true);
    expect(report?.status).toBe('5.1.1');
    expect(report?.diagnostic).toContain('550');
  });

  it('marks a 4.x status as transient (not permanent)', async () => {
    const report = await parseBounce(dsn('4.2.2'));
    expect(report?.recipients).toEqual(['bob@example.com']);
    expect(report?.permanent).toBe(false);
  });

  it('returns null for an ordinary email', async () => {
    const raw = [
      'From: Jane <jane@acme.com>',
      'To: us@mailflow.app',
      'Subject: Re: Pricing',
      'Content-Type: text/plain',
      '',
      'Action: failed is just a phrase I am quoting here.',
      '',
    ].join('\r\n');
    expect(await parseBounce(raw)).toBeNull();
  });
});
