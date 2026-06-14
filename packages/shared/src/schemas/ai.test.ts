import { describe, expect, it } from 'vitest';

import { replyAnalysisSchema } from './ai';

describe('replyAnalysisSchema', () => {
  it('accepts a well-formed analysis', () => {
    const parsed = replyAnalysisSchema.parse({
      intent: 'interested',
      confidence: 0.9,
      summary: 'Prospect is interested.',
      entities: { company: 'Acme' },
      suggestedReply: 'Great — when can we chat?',
    });
    expect(parsed.intent).toBe('interested');
  });

  it('tolerates explicit null entity fields (LLM output)', () => {
    const parsed = replyAnalysisSchema.parse({
      intent: 'question',
      confidence: 0.7,
      summary: 'Has a question.',
      entities: { company: null, role: null, meetingRequest: false },
      suggestedReply: 'Happy to help.',
    });
    expect(parsed.entities.company).toBeNull();
  });

  it('rejects an invalid intent', () => {
    expect(() =>
      replyAnalysisSchema.parse({
        intent: 'maybe',
        confidence: 0.5,
        summary: 's',
        suggestedReply: 'r',
      }),
    ).toThrow();
  });
});
