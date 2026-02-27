import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from './workspace';

const INSTRUCTION_FILES: Record<string, string> = {
  workflow: 'workflow.instructions.md',
  architecture: 'architecture.instructions.md',
  testing: 'testing.instructions.md',
};

const HOOK_SCRIPTS = [
  'session-start.sh',
  'user-prompt-submit.sh',
  'pre-tool-use-auto-select.sh',
  'pre-tool-use-security.sh',
  'pre-tool-use-branch-guard.sh',
  'pre-tool-use-safety-checkpoint.sh',
  'pre-tool-use-doc-first.sh',
  'post-tool-use-format.sh',
  'post-tool-use-typecheck.sh',
  'post-tool-use-logger.sh',
  'pre-compact-save.sh',
  'subagent-start-inject.sh',
  'subagent-stop-validate.sh',
  'stop-summary.sh',
] as const;

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

  // Copy hooks
  const hooksConfigDir = path.join(wsRoot, '.github', 'hooks');
  await fs.mkdir(hooksConfigDir, { recursive: true });

  const configSrc = vscode.Uri.joinPath(context.extensionUri, 'assets', 'hooks', 'agent.json').fsPath;
  const configDest = path.join(hooksConfigDir, 'agent.json');
  try {
    await fs.access(configDest);
    if (overwrite) {
      await fs.copyFile(configSrc, configDest);
      copied++;
    }
  } catch {
    await fs.copyFile(configSrc, configDest);
    copied++;
  }

  const scriptsDir = path.join(wsRoot, 'scripts', 'hooks');
  await fs.mkdir(scriptsDir, { recursive: true });

  for (const script of HOOK_SCRIPTS) {
    const srcPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'hooks', 'scripts', script).fsPath;
    const destPath = path.join(scriptsDir, script);
    try {
      await fs.access(destPath);
      if (!overwrite) continue;
    } catch {
      // File doesn't exist, proceed
    }
    await fs.copyFile(srcPath, destPath);
    await fs.chmod(destPath, 0o755);
    copied++;
  }

  await vscode.window.showInformationMessage(
    `Dev Protocol: Applied ${copied} file(s) — instructions, hooks config, and scripts.`
  );
}
