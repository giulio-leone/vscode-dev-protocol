import * as vscode from 'vscode';

interface EnforceQualityInput {
  readonly proposedSolution: string;
  readonly problemStatement: string;
}

interface QualityCheckResult {
  readonly pass: boolean;
  readonly violations: string[];
  readonly recommendation: string;
}

const WORKAROUND_PATTERNS = [
  /TODO.*fix later/i,
  /hack/i,
  /workaround/i,
  /band.?aid/i,
  /temporary/i,
  /quick.?fix/i,
  /patch/i,
  /bypass/i,
  /as any/,
  /\bignore\b.*\btype\b/i,
];

const SOLID_ANTI_PATTERNS = [
  { pattern: /god.?class|god.?object/i, violation: 'God Class detected — violates Single Responsibility' },
  { pattern: /instanceof.*instanceof.*instanceof/i, violation: 'Multiple instanceof checks — likely OCP violation' },
  { pattern: /switch.*case.*case.*case.*case/i, violation: 'Large switch statement — consider Strategy pattern' },
];

/**
 * LM Tool: devprotocol_enforce_quality
 *
 * Validates a proposed solution against KISS, DRY, SOLID, and Hexagonal Architecture.
 * Rejects workarounds; mandates structural, permanent solutions.
 */
export class EnforceQualityTool implements vscode.LanguageModelTool<EnforceQualityInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<EnforceQualityInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { proposedSolution, problemStatement } = options.input;
    const violations: string[] = [];

    // Check for workarounds
    for (const pattern of WORKAROUND_PATTERNS) {
      if (pattern.test(proposedSolution)) {
        violations.push(`Workaround detected (pattern: ${pattern.source}) — only permanent solutions allowed`);
      }
    }

    // Check SOLID anti-patterns
    for (const { pattern, violation } of SOLID_ANTI_PATTERNS) {
      if (pattern.test(proposedSolution)) {
        violations.push(violation);
      }
    }

    // Check for `any` type
    if (/: any\b|<any>|as any/.test(proposedSolution)) {
      violations.push('TypeScript `any` type detected — use `unknown` + type guards or proper generics');
    }

    const pass = violations.length === 0;
    const recommendation = pass
      ? `✅ Solution passes quality gate for: "${problemStatement}"`
      : [
          `❌ Quality gate FAILED for: "${problemStatement}"`,
          '',
          'Violations:',
          ...violations.map((v) => `  • ${v}`),
          '',
          'Required: Refactor to a structural, permanent solution that addresses the root cause.',
          'Principles: KISS · DRY · SOLID · Hexagonal Architecture',
        ].join('\n');

    const result: QualityCheckResult = { pass, violations, recommendation };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<EnforceQualityInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    return { invocationMessage: 'Running quality gate check...' };
  }
}
