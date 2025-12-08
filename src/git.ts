import simpleGit, { type SimpleGit } from 'simple-git';

export interface CommitInfo {
  hash: string;
  message: string;
}

// Adjust this list to your workflow
const BASE_BRANCH_CANDIDATES = ['stage', 'staging', 'develop', 'dev', 'main', 'master', 'release'];

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

interface BranchDistance {
  shortName: string;
  remoteRef: string;
  ahead: number;
}

/**
 * Try to infer the base branch of the current HEAD.
 *
 * - If `explicitBase` is provided, validates it and returns it.
 * - Otherwise:
 *   - checks remote branches on `remoteName`
 *   - prefers branches from BASE_BRANCH_CANDIDATES
 *   - picks the one with the smallest "ahead" distance from HEAD
 *
 * Example:
 *   main ──┐
 *          ├─ stage ──┐
 *                      └─ feature/add-new-user (HEAD)
 *
 * For HEAD on `feature/add-new-user`, this will return `${remote}/stage`.
 */
export async function resolveBaseBranchName(git: SimpleGit, remoteName: string, explicitBase?: string): Promise<string> {
  // All remote branches (e.g. origin/main, origin/stage, ...)
  const remoteSummary = await git.branch(['-r']);
  const remoteBranches = remoteSummary.all.filter((name) => !name.includes('->'));

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

  // Current local branch name (e.g. "feature/add-new-user")
  const localSummary = await git.branch();
  const currentBranch = localSummary.current;

  // Current HEAD commit hash
  const headSha = (await git.revparse(['HEAD'])).trim();

  // 1) Filter remote branches belonging to this remote
  //    and ignore the remote branch for the current branch itself.
  const remoteBranchesForRemote = remoteBranches
    .filter((name) => name.startsWith(`${remoteName}/`))
    .filter((name) => {
      const short = name.slice(remoteName.length + 1);

      return short !== currentBranch;
    });

  if (remoteBranchesForRemote.length === 0) {
    throw new Error(
      `No remote branches found on "${remoteName}". ` + 'Make sure you have fetched the remote (e.g. "git fetch --all --prune").',
    );
  }

  // 2) Prefer only branches from BASE_BRANCH_CANDIDATES, if present.
  const prioritizedRemoteBranches = remoteBranchesForRemote.filter((fullName) => {
    const short = fullName.slice(remoteName.length + 1);

    return BASE_BRANCH_CANDIDATES.includes(short);
  });

  const candidates = prioritizedRemoteBranches.length > 0 ? prioritizedRemoteBranches : remoteBranchesForRemote;

  let best: BranchDistance | undefined;

  for (const remoteReference of candidates) {
    const shortName = remoteReference.slice(remoteName.length + 1);

    try {
      // Common ancestor between HEAD and this candidate branch
      const mergeBase = (await git.raw(['merge-base', headSha, remoteReference])).trim();

      if (!mergeBase) {
        continue;
      }

      // How many commits is HEAD ahead of the merge base?
      // Smaller = closer ancestor = more likely base branch.
      const aheadString = (await git.raw(['rev-list', '--count', `${mergeBase}..${headSha}`])).trim();
      const ahead = Number.parseInt(aheadString, 10);

      if (!Number.isFinite(ahead)) {
        continue;
      }

      if (!best || ahead < best.ahead) {
        best = { shortName, remoteRef: remoteReference, ahead };
      }
    } catch {
      // If merge-base fails (unrelated histories, etc.), just skip this branch.
      continue;
    }
  }

  if (best) {
    return best.shortName;
  }

  // 3) Fallback to old behaviour if heuristic fails for some reason
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
