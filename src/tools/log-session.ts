import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from '../utils/workspace';

interface MilestoneEntry {
  readonly id: string;
  readonly title: string;
  readonly status: 'done' | 'in-progress' | 'not-started';
}

interface LogSessionInput {
  readonly branch: string;
  readonly milestoneSummary: MilestoneEntry[];
  readonly workSummary: string;
}

const STATUS_ICON: Record<string, string> = {
  done: '✅',
  'in-progress': '🔄',
  'not-started': '⏳',
};

/**
 * LM Tool: devprotocol_log_session
 *
 * Creates or appends to sessions-YYYY-MM-DD.md with work progress.
 */
export class LogSessionTool implements vscode.LanguageModelTool<LogSessionInput> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<LogSessionInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { branch, milestoneSummary, workSummary } = options.input;

    const wsRoot = getWorkspaceRoot();
    if (!wsRoot) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('ERROR: No workspace folder open.'),
      ]);
    }

    const today = new Date().toISOString().slice(0, 10);
    const config = vscode.workspace.getConfiguration('devprotocol');
    const template: string = config.get('sessionLogPath', 'sessions-{date}.md');
    const filename = template.replace('{date}', today);
    const fullPath = path.join(wsRoot, filename);

    const tableRows = milestoneSummary
      .map((m) => `| ${m.id} | ${m.title} | ${STATUS_ICON[m.status] ?? m.status} ${m.status} |`)
      .join('\n');

    const entry = [
      `## Session: ${today}`,
      '',
      `| Field | Value |`,
      `|---|---|`,
      `| **Branch** | \`${branch}\` |`,
      '',
      '### Progress',
      '',
      '| ID | Title | Status |',
      '|---|---|---|',
      tableRows,
      '',
      '### Work Summary',
      '',
      workSummary,
      '',
      '---',
      '',
    ].join('\n');

    let existing = '';
    try {
      existing = await fs.readFile(fullPath, 'utf-8');
    } catch {
      existing = `# Sessions Log\n\n`;
    }

    await fs.writeFile(fullPath, existing + entry, 'utf-8');

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(`Session logged to ${filename}`),
    ]);
  }

  prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<LogSessionInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    return { invocationMessage: 'Logging session progress...' };
  }
}
