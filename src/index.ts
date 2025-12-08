import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Command } from 'commander';
import ora from 'ora';

import { getGhInstallInstructions, isGhInstalled } from './gh';
import { createGitClient, fetchRemote, getCurrentBranchName, getDefaultRemoteName, getNewCommits, resolveBaseBranchName } from './git';
import { logger } from './logger';
import { buildPrDraftMarkdown } from './markdown';

interface CliOptions {
  base?: string;
  output?: string;
}

async function run(): Promise<void> {
  const program = new Command();

  program
    .name('pull-draftsman')
    .description('Generate a pull request draft .md file from your current git branch.')
    .version('0.1.0')
    .option('-b, --base <branch>', 'Base branch to compare against (e.g. main, stage)')
    .option('-o, --output <dir>', 'Directory where the pull request draft .md file will be created', process.cwd());

  program.parse(process.argv);
  const options = program.opts<CliOptions>();

  const spinner = ora();

  spinner.start('Checking GitHub CLI (gh)...');
  const ghInstalled = await isGhInstalled();

  if (ghInstalled) {
    spinner.succeed('GitHub CLI (gh) is installed.');
  } else {
    spinner.fail('GitHub CLI (gh) is not installed.');
    logger.warn(getGhInstallInstructions());
  }

  spinner.start('Checking git repository...');
  const git = await createGitClient(process.cwd());

  spinner.succeed('Git repository detected.');

  spinner.start('Detecting git remote...');
  const remoteName = await getDefaultRemoteName(git);

  spinner.succeed(`Using remote "${remoteName}".`);

  spinner.start(`Fetching latest changes from "${remoteName}"...`);
  await fetchRemote(git, remoteName);
  spinner.succeed(`Fetched latest changes from "${remoteName}".`);

  spinner.start('Determining base branch...');
  const baseBranchName = await resolveBaseBranchName(git, remoteName, options.base);

  spinner.succeed(`Using base branch "${baseBranchName}".`);

  spinner.start('Reading current branch...');
  const branchName = await getCurrentBranchName(git);

  spinner.succeed(`Current branch: "${branchName}".`);

  spinner.start('Collecting new commits...');
  const commits = await getNewCommits(git, remoteName, baseBranchName);

  spinner.succeed(`Found ${commits.length} new commit(s).`);

  spinner.start('Writing pull request draft markdown file...');
  const outputDir = path.resolve(options.output ?? process.cwd());

  await mkdir(outputDir, { recursive: true });

  const safeBranchName = branchName.replaceAll(/[^a-zA-Z0-9._-]+/g, '-');
  const filename = `${Date.now()}-pr-draft-${safeBranchName}.md`;
  const filePath = path.join(outputDir, filename);

  const markdownContent = buildPrDraftMarkdown({
    branchName,
    baseBranchName,
    commits,
  });

  await writeFile(filePath, markdownContent, 'utf8');
  spinner.succeed(`Pull request draft created at: ${filePath}`);

  if (ghInstalled) {
    logger.info('Next step: use Copilot together with gh to read this .md file and open a pull request.');
  } else {
    logger.warn(
      'Note: GitHub CLI (gh) is not installed. Install and authenticate it before using Copilot + gh to turn this draft into a PR.',
    );
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected error while generating PR draft.';

  logger.error(message);
  process.exitCode = 1;
});
