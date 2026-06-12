import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function sanitizeForFilename(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replaceAll(/[^\w.-]+/g, '-')
      .replaceAll(/-+/g, '-')
      .replaceAll(/(?:^-|-$)/g, '') || 'branch'
  );
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, content, 'utf8');
}
