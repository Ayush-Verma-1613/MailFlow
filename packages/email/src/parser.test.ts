import { describe, expect, it } from 'vitest';

import { normalizeSubject, parseRawEmail } from './parser';

describe('normalizeSubject', () => {
  it('strips Re:/Fwd: prefixes', () => {
    expect(normalizeSubject('Re: Re: Hello')).toBe('hello');
    expect(normalizeSubject('FWD: Quote')).toBe('quote');
    expect(normalizeSubject('Plain')).toBe('plain');
  });
});

describe('parseRawEmail', () => {
  it('parses headers, body, and threading fields', async () => {
    const raw = [
      'From: Jane Doe <jane@acme.com>',
      'To: us@mailflow.app',
      'Subject: Re: Pricing',
      'Message-ID: <reply-1@acme.com>',
      'In-Reply-To: <orig-1@mailflow.app>',
      'References: <orig-1@mailflow.app>',
      'Date: Wed, 01 Jan 2025 12:00:00 +0000',
      '',
      'Yes, I am interested.',
    ].join('\r\n');

    const parsed = await parseRawEmail(raw);
    expect(parsed.from).toBe('jane@acme.com');
    expect(parsed.fromName).toBe('Jane Doe');
    expect(parsed.subject).toBe('Re: Pricing');
    expect(parsed.messageId).toBe('<reply-1@acme.com>');
    expect(parsed.inReplyTo).toBe('<orig-1@mailflow.app>');
    expect(parsed.references).toContain('<orig-1@mailflow.app>');
    expect(parsed.snippet).toContain('interested');
  });
});
