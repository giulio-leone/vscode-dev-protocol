import * as vscode from 'vscode';

interface RunSubagentInput {
  readonly task: string;
  readonly thoroughness?: 'quick' | 'medium' | 'thorough';
  readonly expectedOutput?: string;
}

/**
 * LM Tool: devprotocol_run_subagent
 *
 * Generates a structured subagent delegation prompt that the calling LLM
 * can use to invoke a focused sub-task. Returns a prompt fragment ready for
 * injection into the next model request.
 */
export class RunSubagentTool implements vscode.LanguageModelTool<RunSubagentInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<RunSubagentInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { task, thoroughness = 'medium', expectedOutput } = options.input;

    const thoroughnessGuidance: Record<string, string> = {
      quick: 'Focus on the most relevant results only. Stop after the first confident match.',
      medium: 'Balance breadth and depth. Explore 3-5 paths before concluding.',
      thorough: 'Exhaustive exploration. Research all relevant paths and cross-reference results.',
    };

    const outputClause = expectedOutput
      ? `\n\n**Expected output format**: ${expectedOutput}`
      : '';

    const delegationPrompt = [
      `## Subagent Delegation — ${thoroughness.toUpperCase()} thoroughness`,
      '',
      `**Task**: ${task}`,
      '',
      `**Thoroughness guidance**: ${thoroughnessGuidance[thoroughness]}`,
      '',
      '**Constraints**:',
      '- Return only factual findings, no speculation',
      '- Cite file paths and line numbers for code references',
      '- Stop when the task is complete — no over-exploration',
      '- Do not modify files unless explicitly part of the task',
      outputClause,
    ].join('\n');

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(delegationPrompt),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<RunSubagentInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    return {
      invocationMessage: `Delegating (${options.input.thoroughness ?? 'medium'}): ${options.input.task.slice(0, 60)}...`,
    };
  }
}
