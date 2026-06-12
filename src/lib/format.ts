interface SlackMarkdownParameters {
  title: string;
  url: string;
  jiraUrls?: string[];
  body: string;
}

export function formatSlackMarkdown(p: SlackMarkdownParameters): string {
  const body = (p.body ?? '').trim();
  const SEPARATOR = '<br><br>';
  const SEPARATOR_BODY = '<br>';

  const parts = ['@oleh', SEPARATOR, `**${p.title}**`, '', `${p.url}`];

  if (p.jiraUrls && p.jiraUrls.length > 0) {
    parts.push(SEPARATOR, '**Jira**', '', ...p.jiraUrls);
  }

  parts.push(SEPARATOR_BODY, body.replaceAll('##', `${SEPARATOR_BODY}\n\n##`) || '', '');

  return parts.join('\n').trim(); // newline at EOF
}
