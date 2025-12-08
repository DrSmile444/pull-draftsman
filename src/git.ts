import simpleGit, { type SimpleGit } from 'simple-git';

export interface CommitInfo {
  hash: string;
  message: string;
}

const BASE_BRANCH_CANDIDATES = ['main', 'master', 'develop', 'dev', 'stage', 'staging', 'release', 'production', 'prod'];

export async function createGitClient(baseDir: string): Promise<SimpleGit> {
  const git = simpleGit({ baseDir });

  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    throw new Error('Current directory is not a git repository. Run Pull Draftsman from inside a git repo.');
  }

  return git;
}

export async function getCurrentBranchName(git: SimpleGit): Promise<string> {
  const statusSummary = await git.status();

  if (!statusSummary.current) {
    throw new Error('Unable to determine current branch name.');
  }

  return statusSummary.current;
}

export async function getDefaultRemoteName(git: SimpleGit): Promise<string> {
  const remotes = await git.getRemotes(true);

  if (remotes.length === 0) {
    throw new Error('No git remotes configured. Add a remote (for example "origin") and try again.');
  }

  const originRemote = remotes.find((remote) => remote.name === 'origin');

  return originRemote?.name ?? remotes[0]?.name;
}

export async function fetchRemote(git: SimpleGit, remoteName: string): Promise<void> {
  await git.fetch(remoteName);
}

export async function resolveBaseBranchName(git: SimpleGit, remoteName: string, explicitBase?: string): Promise<string> {
  const branchesSummary = await git.branch(['-r']);
  const remoteBranches = branchesSummary.all;

  if (explicitBase) {
    const fullName = `${remoteName}/${explicitBase}`;

    if (!remoteBranches.includes(fullName)) {
      throw new Error(
        `Base branch "${explicitBase}" was not found on remote "${remoteName}". ` +
          `Available remote branches: ${remoteBranches.join(', ')}`,
      );
    }

    return explicitBase;
  }

  for (const candidate of BASE_BRANCH_CANDIDATES) {
    const fullName = `${remoteName}/${candidate}`;

    if (remoteBranches.includes(fullName)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to determine base branch automatically on remote "${remoteName}". ` +
      `Tried: ${BASE_BRANCH_CANDIDATES.join(', ')}. ` +
      'You can pass the base explicitly with the "--base <branch>" option.',
  );
}

export async function getNewCommits(git: SimpleGit, remoteName: string, baseBranchName: string): Promise<CommitInfo[]> {
  const fromReference = `${remoteName}/${baseBranchName}`;
  const logResult = await git.log({ from: fromReference, to: 'HEAD' });

  return logResult.all.map((entry) => ({
    hash: entry.hash.slice(0, 7),
    message: entry.message,
  }));
}
