import * as vscode from 'vscode';

type ParticipantHandler = (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => Promise<vscode.ChatResult>;

/**
 * Creates and registers the @devprotocol chat participant.
 *
 * The participant orchestrates the full Dev Protocol workflow:
 * 1. Iterative #askQuestions clarification loop
 * 2. Zod JSON plan generation
 * 3. Branch creation per milestone
 * 4. Session logging
 */
export function createDevProtocolParticipant(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const participant = vscode.chat.createChatParticipant('devprotocol', createHandler(context));
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'icon.png');
  return participant;
}

function createHandler(context: vscode.ExtensionContext): ParticipantHandler {
  return async (request, _chatContext, stream, token) => {
    const { command, prompt } = request;

    try {
      switch (command) {
        case 'plan':
          return await handlePlan(request, stream, token, context);
        case 'session':
          return await handleSession(stream, context);
        case 'apply':
          return await handleApply(stream, context);
        case 'review':
          return await handleReview(stream, context);
        default:
          return await handleChat(prompt, stream, token, context);
      }
    } catch (err) {
      stream.markdown(`**Dev Protocol Error**: ${String(err)}`);
      return { errorDetails: { message: String(err) } };
    }
  };
}

async function handlePlan(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
  stream.markdown(
    `## Dev Protocol — Planning Session\n\n` +
    `I'll guide you through creating a **Zod JSON plan** for your task.\n\n` +
    `**Task description**: ${request.prompt || '(none provided)'}\n\n` +
    `Use \`devprotocol_ask_questions\` and \`devprotocol_create_plan\` tools ` +
    `to build the plan interactively.\n`
  );

  const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
  if (!models.length) {
    stream.markdown('⚠️ No suitable language model available. Ensure GitHub Copilot is active.');
    return {};
  }

  const model = models[0];
  const systemPrompt = [
    'You are @devprotocol, a workflow orchestration agent.',
    'Your job is to help the user create a structured Zod JSON plan for their task.',
    'Use the devprotocol_ask_questions tool to clarify requirements iteratively.',
    'After gathering requirements, use devprotocol_create_plan to save the plan.',
    'Follow: KISS, DRY, SOLID, Hexagonal Architecture.',
    'Never suggest workarounds — only permanent, structural solutions.',
  ].join('\n');

  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.Assistant(systemPrompt),
    vscode.LanguageModelChatMessage.User(
      request.prompt
        ? `Create a plan for: ${request.prompt}`
        : 'Start the planning session by asking what I want to build.'
    ),
  ];

  const response = await model.sendRequest(messages, { tools: request.toolInvocationToken ? [] : [] }, token);

  for await (const chunk of response.text) {
    stream.markdown(chunk);
  }

  return {};
}

async function handleSession(
  stream: vscode.ChatResponseStream,
  _context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
  stream.markdown(
    `## Dev Protocol — Session Log\n\n` +
    `Use **\`devprotocol_log_session\`** to record progress. ` +
    `Provide the branch name, milestone summary, and work description.\n`
  );
  stream.button({ command: 'devprotocol.openSessionLog', title: '📋 Open session log' });
  return {};
}

async function handleApply(
  stream: vscode.ChatResponseStream,
  _context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
  stream.markdown(
    `## Dev Protocol — Apply Instructions\n\n` +
    `The **\`devprotocol_apply_instructions\`** tool will copy bundled ` +
    `\`.instructions.md\` files to your workspace \`.github/instructions/\`.\n\n` +
    `Available categories: \`workflow\`, \`architecture\`, \`testing\`, or \`all\`.\n`
  );
  return {};
}

async function handleReview(
  stream: vscode.ChatResponseStream,
  _context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
  stream.markdown(
    `## Dev Protocol — Plan Review\n\n` +
    `I'll analyze the current \`.github/plan.json\` and suggest next steps.\n` +
    `Use **\`devprotocol_create_plan\`** to update the plan after review.\n`
  );
  return {};
}

async function handleChat(
  prompt: string,
  stream: vscode.ChatResponseStream,
  _token: vscode.CancellationToken,
  _context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
  stream.markdown(
    `## @devprotocol\n\n` +
    `Available commands:\n` +
    `- \`@devprotocol /plan <task>\` — Start a planning session\n` +
    `- \`@devprotocol /session\` — Log current session progress\n` +
    `- \`@devprotocol /apply\` — Apply instructions to workspace\n` +
    `- \`@devprotocol /review\` — Review plan progress\n\n` +
    `Or use the LM tools directly in any Copilot chat:\n` +
    `\`devprotocol_ask_questions\`, \`devprotocol_create_plan\`, ` +
    `\`devprotocol_log_session\`, \`devprotocol_create_branch\`, ` +
    `\`devprotocol_document_first\`, \`devprotocol_enforce_quality\`, ` +
    `\`devprotocol_apply_instructions\`, \`devprotocol_run_subagent\`\n`
  );

  if (prompt) {
    stream.markdown(`\n---\n*You asked*: "${prompt}"\n`);
  }

  return {};
}
