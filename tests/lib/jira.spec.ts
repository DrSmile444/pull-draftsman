import { describe, expect, it } from 'vitest';

import { buildJiraBaseUrl, buildJiraTicketUrl, extractJiraKeysFromTitle } from '../../src/lib/jira.js';

describe('extractJiraKeysFromTitle', () => {
  it('extracts bracketed key', () => {
    expect(extractJiraKeysFromTitle('[RV-302] Add login page')).toEqual(['RV-302']);
  });

  it('extracts parenthesised key', () => {
    expect(extractJiraKeysFromTitle('(AM-23) Fix bug')).toEqual(['AM-23']);
  });

  it('extracts multiple bracketed keys', () => {
    expect(extractJiraKeysFromTitle('[AM-23] [AM-24] Some feature')).toEqual(['AM-23', 'AM-24']);
  });

  it('falls back to generic match when no brackets', () => {
    expect(extractJiraKeysFromTitle('Feature AM-23 and PROJ-99 improvements')).toEqual(['AM-23', 'PROJ-99']);
  });

  it('prefers bracket matches over generic when both present', () => {
    expect(extractJiraKeysFromTitle('[RV-1] Mentions PROJ-2 in text')).toEqual(['RV-1']);
  });

  it('returns empty array when no keys found', () => {
    expect(extractJiraKeysFromTitle('No ticket here')).toEqual([]);
  });
});

describe('buildJiraTicketUrl', () => {
  it('builds url without trailing slash', () => {
    expect(buildJiraTicketUrl({ baseUrl: 'https://acme.atlassian.net', key: 'RV-1' })).toBe('https://acme.atlassian.net/browse/RV-1');
  });

  it('trims trailing slashes from baseUrl', () => {
    expect(buildJiraTicketUrl({ baseUrl: 'https://acme.atlassian.net///', key: 'RV-1' })).toBe('https://acme.atlassian.net/browse/RV-1');
  });
});

describe('buildJiraBaseUrl', () => {
  it('builds correct atlassian url', () => {
    expect(buildJiraBaseUrl('zipifyapps')).toBe('https://zipifyapps.atlassian.net');
  });
});
