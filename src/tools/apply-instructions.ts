import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from '../utils/workspace';

interface ApplyInstructionsInput {
  readonly categories?: Array<'workflow' | 'architecture' | 'testing' | 'all'>;
  readonly overwrite?: boolean;
}

const INSTRUCTION_FILES: Record<string, string> = {
  workflow: 'workflow.instructions.md',
  architecture: 'architecture.instructions.md',
  testing: 'testing.instructions.md',
};

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

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Applied ${toApply.length} instruction files to .github/instructions/:\n${results.join('\n')}`
      ),
    ]);
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
