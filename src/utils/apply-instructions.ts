import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from './workspace';

const INSTRUCTION_FILES: Record<string, string> = {
  workflow: 'workflow.instructions.md',
  architecture: 'architecture.instructions.md',
  testing: 'testing.instructions.md',
};

export async function applyInstructionsToWorkspace(
  context: vscode.ExtensionContext,
  categories: string[],
  overwrite: boolean
): Promise<void> {
  const wsRoot = getWorkspaceRoot();
  if (!wsRoot) {
    await vscode.window.showErrorMessage('Dev Protocol: No workspace folder open.');
    return;
  }

  const targetDir = path.join(wsRoot, '.github', 'instructions');
  await fs.mkdir(targetDir, { recursive: true });

  const toApply = categories.includes('all')
    ? Object.keys(INSTRUCTION_FILES)
    : categories.filter((c) => c !== 'all');

  let copied = 0;
  for (const category of toApply) {
    const filename = INSTRUCTION_FILES[category];
    if (!filename) continue;

    const srcPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'instructions', filename).fsPath;
    const destPath = path.join(targetDir, filename);

    try {
      await fs.access(destPath);
      if (!overwrite) continue;
    } catch {
      // File doesn't exist, proceed
    }

    await fs.copyFile(srcPath, destPath);
    copied++;
  }

  await vscode.window.showInformationMessage(
    `Dev Protocol: Applied ${copied} instruction file(s) to .github/instructions/`
  );
}
