import { describe, expect, it } from 'vitest';

import { classifyGmailError } from './gmail';
import { classifySmtpError } from './smtp';

describe('classifySmtpError', () => {
  it('treats 4xx and connection errors as transient/retryable', () => {
    expect(classifySmtpError({ responseCode: 421 })).toEqual({
      retryable: true,
      kind: 'transient',
    });
    expect(classifySmtpError(new Error('ECONNRESET'))).toEqual({
      retryable: true,
      kind: 'transient',
    });
  });

  it('treats 550/553 as a permanent recipient (hard bounce) failure', () => {
    expect(classifySmtpError({ responseCode: 550 })).toEqual({
      retryable: false,
      kind: 'recipient',
    });
    expect(classifySmtpError({ responseCode: 553 })).toEqual({
      retryable: false,
      kind: 'recipient',
    });
  });

  it('treats 530/535 as a permanent auth failure', () => {
    expect(classifySmtpError({ responseCode: 535 })).toEqual({
      retryable: false,
      kind: 'auth',
    });
  });
});

describe('classifyGmailError', () => {
  it('treats 401/403 as a permanent auth failure', () => {
    expect(classifyGmailError({ code: 401 })).toEqual({ retryable: false, kind: 'auth' });
    expect(classifyGmailError({ status: 403 })).toEqual({ retryable: false, kind: 'auth' });
  });

  it('treats 400 as a permanent recipient failure', () => {
    expect(classifyGmailError({ code: 400 })).toEqual({ retryable: false, kind: 'recipient' });
  });

  it('treats 429/5xx and unknown as transient/retryable', () => {
    expect(classifyGmailError({ code: 429 })).toEqual({ retryable: true, kind: 'transient' });
    expect(classifyGmailError({ status: 503 })).toEqual({ retryable: true, kind: 'transient' });
    expect(classifyGmailError(new Error('network'))).toEqual({
      retryable: true,
      kind: 'transient',
    });
  });
});
