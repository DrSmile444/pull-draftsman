import { describe, expect, it } from 'vitest';

import { formatSlackMarkdown } from '../../src/lib/format.js';

describe('formatSlackMarkdown', () => {
  it('produces basic structure with title and url', () => {
    const result = formatSlackMarkdown({ title: 'My PR', url: 'https://github.com/org/repo/pull/1', body: '' });

    expect(result).toContain('**My PR**');
    expect(result).toContain('https://github.com/org/repo/pull/1');
    expect(result).toContain('@oleh');
  });

  it('includes jira section when urls provided', () => {
    const result = formatSlackMarkdown({
      title: 'My PR',
      url: 'https://github.com/org/repo/pull/1',
      jiraUrls: ['https://acme.atlassian.net/browse/RV-1'],
      body: '',
    });

    expect(result).toContain('**Jira**');
    expect(result).toContain('https://acme.atlassian.net/browse/RV-1');
  });

  it('omits jira section when no urls', () => {
    const result = formatSlackMarkdown({
      title: 'My PR',
      url: 'https://github.com/org/repo/pull/1',
      jiraUrls: [],
      body: '',
    });

    expect(result).not.toContain('**Jira**');
  });

  it('includes body content', () => {
    const result = formatSlackMarkdown({
      title: 'My PR',
      url: 'https://github.com/org/repo/pull/1',
      body: '## What\nSome change\n## Why\nNeeded',
    });

    expect(result).toContain('Some change');
    expect(result).toContain('Needed');
  });

  it('handles empty body gracefully', () => {
    const result = formatSlackMarkdown({ title: 'My PR', url: 'https://github.com/org/repo/pull/1', body: '   ' });

    expect(typeof result).toBe('string');
  });
});
