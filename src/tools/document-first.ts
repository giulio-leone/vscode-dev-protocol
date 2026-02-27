import * as vscode from 'vscode';

interface DocumentFirstInput {
  readonly library: string;
  readonly topic?: string;
}

/**
 * LM Tool: devprotocol_document_first
 *
 * Instructs the agent to fetch documentation via Context7 MCP before implementing.
 * Returns a structured prompt fragment the agent can include in its next LM request.
 */
export class DocumentFirstTool implements vscode.LanguageModelTool<DocumentFirstInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<DocumentFirstInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { library, topic } = options.input;

    const topicClause = topic ? ` focusing on: "${topic}"` : '';
    const guidance = [
      `## Document-First Protocol for \`${library}\``,
      '',
      `Before implementing, fetch documentation for \`${library}\`${topicClause} using these steps:`,
      '',
      `**Step 1** — Resolve library ID via Context7:`,
      '```',
      `mcp_upstash_conte_resolve-library-id { "libraryName": "${library}" }`,
      '```',
      '',
      `**Step 2** — Fetch documentation with the resolved ID:`,
      '```',
      `mcp_upstash_conte_query-docs { "context7CompatibleLibraryId": "<id>", "topic": "${topic ?? library}" }`,
      '```',
      '',
      'Only proceed to implementation after reviewing the official documentation.',
      '',
      `**Priority order**: Context7 docs > existing repo code > web search > assumption`,
    ].join('\n');

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(guidance),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<DocumentFirstInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    return {
      invocationMessage: `Fetching documentation guidance for ${options.input.library}`,
    };
  }
}
