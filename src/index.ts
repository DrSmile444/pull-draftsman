import path from 'node:path';
import process from 'node:process';

import chalk from 'chalk';
import ora from 'ora';

import packageJson from '../package.json' assert { type: 'json' };

import { formatSlackMarkdown } from './lib/format.js';
import { getPullRequest } from './lib/gh.js';
import { getCurrentBranch } from './lib/git.js';
import { buildJiraBaseUrl, buildJiraTicketUrl, extractJiraKeysFromTitle } from './lib/jira.js';
import { sanitizeForFilename, writeTextFile } from './lib/write.js';

interface CliOptions {
  outDirectory: string;
  jiraServerName: string;
}

function parseArguments(argv: string[]): CliOptions {
  const defaults: CliOptions = {
    outDirectory: '.',
    jiraServerName: process.env.JIRA_SERVER_NAME?.trim() || 'zipifyapps',
  };

  const argumentsList = argv.slice(2);

  const getValue = (flag: string): string | undefined => {
    const index = argumentsList.indexOf(flag);

    if (index === -1) {
      return undefined;
    }

    return argumentsList[index + 1];
  };

  const outDirectory = getValue('--out-dir') ?? defaults.outDirectory;
  const jiraServerName = getValue('--jira-server') ?? defaults.jiraServerName;

  return {
    outDirectory,
    jiraServerName,
  };
}

function printHelp() {
  console.info(
    `
${chalk.bold('pull-draftsman')} — draft a Slack message for the current PR
Version: ${chalk.cyan(packageJson.version)}

Usage:
${chalk.cyan('pull-draftsman')} [--jira-server <name>] [--out-dir <dir>]
${chalk.cyan('prd')} [--jira-server <name>] [--out-dir <dir>]

Options:
--jira-server  Jira server name (e.g. ${chalk.gray('avatarmy')} → https://avatarmy.atlassian.net), or env JIRA_SERVER_NAME (default: ${chalk.gray('avatarmy')})
--out-dir      Output directory (default: ${chalk.gray('.')})
-h, --help     Show help
`.trim(),
  );
}

async function main() {
  const options = parseArguments(process.argv);

  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    printHelp();

    return;
  }

  console.info(chalk.bold('\nPull Draftsman'));
  console.info(chalk.gray('Drafting a Slack-ready PR message using gh + git...\n'));

  const prSpinner = ora('Reading pull request data via gh...').start();

  const pr = await getPullRequest().catch((error: unknown) => {
    prSpinner.fail('Failed to read pull request data.');
    throw error;
  });

  prSpinner.succeed(`PR found: ${chalk.white(pr.title)}`);

  const branchSpinner = ora('Reading current git branch...').start();

  const branch = await getCurrentBranch().catch((error: unknown) => {
    branchSpinner.fail('Failed to read git branch.');
    throw error;
  });

  branchSpinner.succeed(`Branch: ${chalk.white(branch)}`);

  const jiraSpinner = ora('Extracting Jira ticket(s) from PR title...').start();
  const jiraKeys = extractJiraKeysFromTitle(pr.title);
  const jiraBaseUrl = buildJiraBaseUrl(options.jiraServerName);

  let jiraUrls: string[] = [];

  if (jiraKeys.length > 0) {
    jiraUrls = jiraKeys.map((key) => buildJiraTicketUrl({ baseUrl: jiraBaseUrl, key }));

    const jiraList = jiraKeys.map((k, index) => `${chalk.white(k)} → ${chalk.gray(jiraUrls[index])}`).join(', ');

    jiraSpinner.succeed(`Jira: ${jiraList}`);
  } else {
    jiraSpinner.warn(`No Jira key found in title. Expected something like ${chalk.white('[RV-302]')} in:\n${chalk.gray(pr.title)}`);
  }

  const mdSpinner = ora('Building Slack markdown and writing file...').start();
  const filename = `${Date.now()}-pr-slack-message-${sanitizeForFilename(branch)}.md`;
  const filePath = path.resolve(options.outDirectory, filename);

  const content = formatSlackMarkdown({
    title: pr.title,
    url: pr.url,
    jiraUrls,
    body: pr.body,
  });

  await writeTextFile(filePath, content).catch((error: unknown) => {
    mdSpinner.fail('Failed to write markdown file.');
    throw error;
  });

  mdSpinner.succeed(`Created: ${chalk.green(filePath)}\n`);
}

main().catch((error) => {
  const fallbackMessage = typeof error === 'string' ? error : 'Unknown error';
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;

  console.error(chalk.red('\nError:'), errorMessage);

  console.error(
    chalk.gray(
      '\nHints:\n' +
        '- Ensure `gh auth status` is OK\n' +
        '- Ensure you are in a repo with an open PR for the current branch\n' +
        '- Try `gh pr view --json title,body,url` manually\n',
    ),
  );

  process.exitCode = 1;
});
