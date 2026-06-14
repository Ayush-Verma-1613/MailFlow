import { describe, expect, it } from 'vitest';

import { sanitizeCsvCell } from './csv';

describe('sanitizeCsvCell', () => {
  it('passes through ordinary values unchanged', () => {
    expect(sanitizeCsvCell('Alice')).toBe('Alice');
    expect(sanitizeCsvCell('lead@acme.com')).toBe('lead@acme.com');
    expect(sanitizeCsvCell('O’Brien')).toBe('O’Brien');
  });

  it('neutralises formula-triggering leading characters', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+1 (555) 000')).toBe("'+1 (555) 000");
    expect(sanitizeCsvCell('-2')).toBe("'-2");
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(sanitizeCsvCell('=cmd|"/c calc"!A1')).toBe('\'=cmd|"/c calc"!A1');
    expect(sanitizeCsvCell('\tTAB')).toBe("'\tTAB");
  });

  it('coerces non-strings and nullish to safe strings', () => {
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');
    expect(sanitizeCsvCell(42)).toBe('42');
  });
});
