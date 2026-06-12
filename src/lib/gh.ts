import { execa } from 'execa';

export interface PullRequestInfo {
  title: string;
  body: string;
  url: string;
}

export async function getPullRequest(): Promise<PullRequestInfo> {
  const { stdout } = await execa('gh', ['pr', 'view', '--json', 'title,body,url'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error('Failed to parse `gh pr view` JSON output.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Unexpected `gh pr view` output (not an object).');
  }

  const object = parsed as Record<string, unknown>;
  const title = typeof object.title === 'string' ? object.title : undefined;
  const body = typeof object.body === 'string' ? object.body : '';
  const url = typeof object.url === 'string' ? object.url : undefined;

  if (!title) {
    throw new Error('PR title is missing from `gh pr view` output.');
  }

  if (!url) {
    throw new Error('PR url is missing from `gh pr view` output.');
  }

  return { title, body, url };
}
