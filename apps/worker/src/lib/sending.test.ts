import { describe, expect, it } from 'vitest';

import { buildPlainText, effectiveDailyCap, htmlToText, unsubscribeHeaders } from './sending';

describe('htmlToText', () => {
  it('strips tags and decodes entities into readable text', () => {
    const html = '<p>Hi&nbsp;Jane</p><div>Let&#39;s talk &amp; meet</div>';
    expect(htmlToText(html)).toBe("Hi Jane\nLet's talk & meet");
  });

  it('drops style/script blocks and collapses blank lines', () => {
    const html = '<style>p{color:red}</style><p>One</p><p>Two</p>';
    expect(htmlToText(html)).toBe('One\nTwo');
  });
});

describe('buildPlainText', () => {
  it('appends an unsubscribe line', () => {
    const text = buildPlainText('<p>Hello</p>', 'https://app.test/api/unsubscribe/tok');
    expect(text).toContain('Hello');
    expect(text).toContain('Unsubscribe: https://app.test/api/unsubscribe/tok');
  });
});

describe('unsubscribeHeaders', () => {
  it('builds RFC 8058 one-click headers', () => {
    expect(unsubscribeHeaders('https://app.test/api/unsubscribe/tok')).toEqual({
      'List-Unsubscribe': '<https://app.test/api/unsubscribe/tok>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});

describe('effectiveDailyCap', () => {
  const DAY = 86_400_000;

  it('returns the full cap when warmup is disabled', () => {
    expect(effectiveDailyCap({ dailyCap: 500, warmupDay: 0 })).toBe(500);
    expect(effectiveDailyCap({ dailyCap: 500 })).toBe(500);
  });

  it('ramps linearly from day one to fully warmed', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    // Day 1 (age 0): 500 * 1/10 = 50
    expect(effectiveDailyCap({ dailyCap: 500, warmupDay: 10, createdAt: now, now })).toBe(50);
    // Day 5 (age 4): 500 * 5/10 = 250
    expect(
      effectiveDailyCap({
        dailyCap: 500,
        warmupDay: 10,
        createdAt: new Date(now.getTime() - 4 * DAY),
        now,
      }),
    ).toBe(250);
  });

  it('clamps to the full cap once warmup completes', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    expect(
      effectiveDailyCap({
        dailyCap: 500,
        warmupDay: 10,
        createdAt: new Date(now.getTime() - 30 * DAY),
        now,
      }),
    ).toBe(500);
  });

  it('never returns below a small floor on day one', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    // 100 * 1/30 = 3.3 → floored to min(cap,10) = 10
    expect(effectiveDailyCap({ dailyCap: 100, warmupDay: 30, createdAt: now, now })).toBe(10);
  });
});
