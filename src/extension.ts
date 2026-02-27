import * as vscode from 'vscode';
import { registerAllTools } from './tools';
import { createDevProtocolParticipant } from './agent/participant';

export function activate(context: vscode.ExtensionContext): void {
  console.debug('[DevProtocol] Activating extension v' + context.extension.packageJSON.version);

  // Register all LM tools (available to all Copilot agents)
  const toolDisposables = registerAllTools(context);

  // Register @devprotocol chat participant
  const participant = createDevProtocolParticipant(context);

  // Register configuration-driven commands
  const applyCmd = vscode.commands.registerCommand(
    'devprotocol.applyInstructions',
    async () => {
      const { applyInstructionsToWorkspace } = await import('./utils/apply-instructions');
      await applyInstructionsToWorkspace(context, ['all'], false);
    }
  );

  context.subscriptions.push(...toolDisposables, participant, applyCmd);

  console.debug('[DevProtocol] Extension activated — tools and participant registered');
}

export function deactivate(): void {
  console.debug('[DevProtocol] Deactivating extension');
}
