import type { CommitInfo } from './git';

export interface PrDraftMarkdownParameters {
  branchName: string;
  baseBranchName: string;
  remoteName: string;
  commits: CommitInfo[];
}

export function buildPrDraftMarkdown(parameters: PrDraftMarkdownParameters): string {
  const { branchName, baseBranchName, remoteName, commits } = parameters;

  const commitLines =
    commits.length > 0
      ? commits.map((commit) => `- ${commit.hash} ${commit.message}`).join('\n')
      : '- (no new commits between base and current branch)';

  return [
    `Branch: ${branchName}`,
    '',
    `Base: ${remoteName}/${baseBranchName}`,
    '',
    'New commits:',
    '',
    commitLines,
    '',
    'Assignees:',
    '',
    '- Placeholder for assignees (not dynamic)',
    '',
    'Reviewers:',
    '',
    '- Placeholder for reviewers (not dynamic)',
    '',
  ].join('\n');
}
