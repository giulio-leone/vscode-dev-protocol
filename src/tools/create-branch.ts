import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import { getWorkspaceRoot } from '../utils/workspace';

const execAsync = util.promisify(cp.exec);

interface CreateBranchInput {
  readonly name: string;
  readonly prefix?: 'feat' | 'fix' | 'chore' | 'docs';
  readonly fromBranch?: string;
}

/**
 * LM Tool: devprotocol_create_branch
 *
 * Creates a protocol-compliant git branch and validates clean working tree.
 */
export class CreateBranchTool implements vscode.LanguageModelTool<CreateBranchInput> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CreateBranchInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { name, prefix = 'feat', fromBranch } = options.input;
    const branchName = `${prefix}/${name}`;

    const wsRoot = getWorkspaceRoot();
    if (!wsRoot) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('ERROR: No workspace folder open.'),
      ]);
    }

    // Check for uncommitted changes first
    try {
      const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: wsRoot });
      if (statusOut.trim()) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `WARNING: Uncommitted changes detected. Stash or commit before branching.\n\n${statusOut}`
          ),
        ]);
      }
    } catch (err) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`ERROR: git status failed — ${String(err)}`),
      ]);
    }

    // Create branch
    const checkoutCmd = fromBranch
      ? `git checkout -b ${branchName} ${fromBranch}`
      : `git checkout -b ${branchName}`;

    try {
      await execAsync(checkoutCmd, { cwd: wsRoot });
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Branch created: ${branchName}`),
      ]);
    } catch (err) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`ERROR: Branch creation failed — ${String(err)}`),
      ]);
    }
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<CreateBranchInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    const prefix = options.input.prefix ?? 'feat';
    return {
      invocationMessage: `Creating branch ${prefix}/${options.input.name}`,
    };
  }
}
