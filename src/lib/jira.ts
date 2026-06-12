export function extractJiraKeysFromTitle(title: string): string[] {
  const bracketMatches = [...title.matchAll(/[[(]([A-Z][A-Z0-9]+-\d+)[)\]]/g)];

  if (bracketMatches.length > 0) {
    return bracketMatches.map((m) => m[1]);
  }

  const genericMatches = [...title.matchAll(/\b([A-Z]+-\d+)\b/g)];

  return genericMatches.map((m) => m[1]);
}

export function buildJiraTicketUrl(parameters: { baseUrl: string; key: string }): string {
  let base = parameters.baseUrl;

  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  return `${base}/browse/${parameters.key}`;
}

export function buildJiraBaseUrl(serverName: string): string {
  return `https://${serverName}.atlassian.net`;
}
