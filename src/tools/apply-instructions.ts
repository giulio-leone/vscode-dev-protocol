import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from '../utils/workspace';

interface ApplyInstructionsInput {
  readonly categories?: Array<'workflow' | 'architecture' | 'testing' | 'hooks' | 'all'>;
  readonly overwrite?: boolean;
}

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

/**
 * LM Tool: devprotocol_apply_instructions
 *
 * Copies bundled .instructions.md files from the extension assets to the
 * current workspace .github/instructions/ directory.
 */
export class ApplyInstructionsTool implements vscode.LanguageModelTool<ApplyInstructionsInput> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ApplyInstructionsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { categories = ['all'], overwrite = false } = options.input;

    const wsRoot = getWorkspaceRoot();
    if (!wsRoot) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('ERROR: No workspace folder open.'),
      ]);
    }

    const targetDir = path.join(wsRoot, '.github', 'instructions');
    await fs.mkdir(targetDir, { recursive: true });

    const toApply = categories.includes('all')
      ? Object.keys(INSTRUCTION_FILES)
      : categories.filter((c) => c !== 'all');

    const results: string[] = [];

    for (const category of toApply) {
      const filename = INSTRUCTION_FILES[category];
      if (!filename) continue;

      const srcPath = vscode.Uri.joinPath(
        this.context.extensionUri,
        'assets',
        'instructions',
        filename
      ).fsPath;

      const destPath = path.join(targetDir, filename);

      try {
        await fs.access(destPath);
        if (!overwrite) {
          results.push(`⏭️ skipped ${filename} (already exists, use overwrite:true to replace)`);
          continue;
        }
      } catch {
        // File doesn't exist, proceed
      }

      await fs.copyFile(srcPath, destPath);
      results.push(`✅ copied ${filename}`);
    }

    // Copy hooks if requested
    if (categories.includes('all') || categories.includes('hooks')) {
      const hooksResults = await this.copyHooks(wsRoot, overwrite);
      results.push(...hooksResults);
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Applied to workspace:\n${results.join('\n')}`
      ),
    ]);
  }

  private async copyHooks(wsRoot: string, overwrite: boolean): Promise<string[]> {
    const results: string[] = [];

    // Copy agent.json hook config
    const hooksConfigDir = path.join(wsRoot, '.github', 'hooks');
    await fs.mkdir(hooksConfigDir, { recursive: true });

    const configSrc = vscode.Uri.joinPath(
      this.context.extensionUri, 'assets', 'hooks', 'agent.json'
    ).fsPath;
    const configDest = path.join(hooksConfigDir, 'agent.json');

    try {
      await fs.access(configDest);
      if (!overwrite) {
        results.push('⏭️ skipped .github/hooks/agent.json (exists)');
      } else {
        await fs.copyFile(configSrc, configDest);
        results.push('✅ copied .github/hooks/agent.json');
      }
    } catch {
      await fs.copyFile(configSrc, configDest);
      results.push('✅ copied .github/hooks/agent.json');
    }

    // Copy hook scripts
    const scriptsDir = path.join(wsRoot, 'scripts', 'hooks');
    await fs.mkdir(scriptsDir, { recursive: true });

    for (const script of HOOK_SCRIPTS) {
      const srcPath = vscode.Uri.joinPath(
        this.context.extensionUri, 'assets', 'hooks', 'scripts', script
      ).fsPath;
      const destPath = path.join(scriptsDir, script);

      try {
        await fs.access(destPath);
        if (!overwrite) {
          results.push(`⏭️ skipped scripts/hooks/${script} (exists)`);
          continue;
        }
      } catch {
        // File doesn't exist, proceed
      }

      await fs.copyFile(srcPath, destPath);
      // Preserve execute permission
      await fs.chmod(destPath, 0o755);
      results.push(`✅ copied scripts/hooks/${script}`);
    }

    return results;
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ApplyInstructionsInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    const cats = options.input.categories ?? ['all'];
    return {
      invocationMessage: `Applying ${cats.join(', ')} instructions to workspace`,
    };
  }
}
