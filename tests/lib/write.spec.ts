import { describe, expect, it } from 'vitest';

import { sanitizeForFilename } from '../../src/lib/write.js';

describe('sanitizeForFilename', () => {
  it('lowercases input', () => {
    expect(sanitizeForFilename('MyBranch')).toBe('mybranch');
  });

  it('replaces slashes with dashes', () => {
    expect(sanitizeForFilename('feature/my-branch')).toBe('feature-my-branch');
  });

  it('collapses multiple separators', () => {
    expect(sanitizeForFilename('feat//my   branch')).toBe('feat-my-branch');
  });

  it('trims leading and trailing dashes', () => {
    expect(sanitizeForFilename('/leading-and-trailing/')).toBe('leading-and-trailing');
  });

  it('returns branch when input is empty', () => {
    expect(sanitizeForFilename('')).toBe('branch');
  });

  it('returns branch when input is only special chars', () => {
    expect(sanitizeForFilename('///')).toBe('branch');
  });

  it('preserves dots and dashes', () => {
    expect(sanitizeForFilename('v1.2.3-beta')).toBe('v1.2.3-beta');
  });
});
