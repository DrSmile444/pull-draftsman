import { execa } from 'execa';

export async function isGhInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execa('gh', ['--version']);

    return stdout.toLowerCase().includes('gh version');
  } catch {
    return false;
  }
}

export function getGhInstallInstructions(): string {
  return [
    'GitHub CLI (gh) was not found in your PATH.',
    '',
    'Pull Draftsman uses gh together with Copilot to turn your markdown draft into a pull request.',
    '',
    'Install GitHub CLI with one of the following commands:',
    '  • macOS (Homebrew):   brew install gh',
    '  • Ubuntu/Debian:      sudo apt install gh',
    '  • Fedora:             sudo dnf install gh',
    '  • Arch Linux:         sudo pacman -S github-cli',
    '  • Windows (winget):   winget install --id GitHub.cli -e',
    '',
    'After installation, authenticate with your GitHub account:',
    '  gh auth login',
    '',
    'Once gh is installed and authenticated, you can use Copilot + gh to read the generated .md file',
    'and create a pull request based on it.',
  ].join('\n');
}
