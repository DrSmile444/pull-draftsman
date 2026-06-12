import { execa } from 'execa';

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const branch = stdout.trim();

  if (!branch) {
    throw new Error('Empty branch name from git.');
  }

  return branch;
}
