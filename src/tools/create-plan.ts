import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from '../utils/workspace';

interface Milestone {
  readonly id: string;
  readonly title: string;
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly issues: Issue[];
}

interface Issue {
  readonly id: string;
  readonly task: string;
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly deps: string[];
}

interface CreatePlanInput {
  readonly prd: string;
  readonly contesto: string;
  readonly milestones: Milestone[];
}

interface PlanFile {
  readonly plan: {
    readonly PRD: string;
    readonly contesto: string;
    readonly milestones: Record<string, {
      readonly id: string;
      readonly title: string;
      readonly priority: string;
      readonly issues: Record<string, {
        readonly id: string;
        readonly task: string;
        readonly priority: string;
        readonly status: string;
        readonly deps: string[];
      }>;
    }>;
  };
}

/**
 * LM Tool: devprotocol_create_plan
 *
 * Generates and saves a Zod JSON plan with milestones and hierarchical issues.
 */
export class CreatePlanTool implements vscode.LanguageModelTool<CreatePlanInput> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CreatePlanInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { prd, contesto, milestones } = options.input;

    const planData: PlanFile = {
      plan: {
        PRD: prd,
        contesto,
        milestones: Object.fromEntries(
          milestones.map((m) => [
            m.id,
            {
              id: m.id,
              title: m.title,
              priority: m.priority,
              issues: Object.fromEntries(
                m.issues.map((issue) => [
                  issue.id,
                  { ...issue, status: 'not-started' }
                ])
              ),
            },
          ])
        ),
      },
    };

    const wsRoot = getWorkspaceRoot();
    if (!wsRoot) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('ERROR: No workspace folder open. Open a folder first.'),
      ]);
    }

    const config = vscode.workspace.getConfiguration('devprotocol');
    const outputPath: string = config.get('planOutputPath', '.github/plan.json');
    const fullPath = path.join(wsRoot, outputPath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(planData, null, 2), 'utf-8');

    const relPath = path.relative(wsRoot, fullPath);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Plan saved to ${relPath} with ${milestones.length} milestones and ${milestones.reduce((acc, m) => acc + m.issues.length, 0)} issues.`
      ),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<CreatePlanInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    const totalIssues = options.input.milestones.reduce((acc, m) => acc + m.issues.length, 0);
    return {
      invocationMessage: `Creating plan with ${options.input.milestones.length} milestones, ${totalIssues} issues`,
    };
  }
}
