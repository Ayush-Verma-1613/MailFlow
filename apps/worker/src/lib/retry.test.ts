import { describe, expect, it } from 'vitest';

import { isExhausted } from './retry';

describe('isExhausted', () => {
  it('is true once attemptsMade reaches the job attempt limit', () => {
    expect(isExhausted({ attemptsMade: 3, opts: { attempts: 3 } })).toBe(true);
    expect(isExhausted({ attemptsMade: 4, opts: { attempts: 3 } })).toBe(true);
  });

  it('is false while retries remain', () => {
    expect(isExhausted({ attemptsMade: 1, opts: { attempts: 3 } })).toBe(false);
    expect(isExhausted({ attemptsMade: 2, opts: { attempts: 3 } })).toBe(false);
  });

  it('falls back to the default attempt limit when opts is absent', () => {
    // DEFAULT_JOB_OPTS.attempts is 5.
    expect(isExhausted({ attemptsMade: 4 })).toBe(false);
    expect(isExhausted({ attemptsMade: 5 })).toBe(true);
  });
});
