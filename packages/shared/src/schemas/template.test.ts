import { describe, expect, it } from 'vitest';

import { extractMergeTags, renderMergeTags } from './template';

describe('extractMergeTags', () => {
  it('extracts unique tags across parts', () => {
    const tags = extractMergeTags('Hi {{firstName}}', '<p>{{firstName}} at {{company}}</p>');
    expect(tags.sort()).toEqual(['company', 'firstName']);
  });
  it('returns empty when no tags', () => {
    expect(extractMergeTags('plain text')).toEqual([]);
  });
});

describe('renderMergeTags', () => {
  it('replaces known tags', () => {
    expect(renderMergeTags('Hi {{firstName}}', { firstName: 'Ada' })).toBe('Hi Ada');
  });
  it('supports dotted paths', () => {
    expect(renderMergeTags('{{contact.email}}', { contact: { email: 'a@b.com' } })).toBe('a@b.com');
  });
  it('uses fallback for unknown/empty', () => {
    expect(renderMergeTags('Hi {{firstName}}', {}, 'there')).toBe('Hi there');
    expect(renderMergeTags('Hi {{firstName}}', { firstName: '' }, 'there')).toBe('Hi there');
  });
});
