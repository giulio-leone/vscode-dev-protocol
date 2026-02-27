import * as vscode from 'vscode';
import * as path from 'path';
import { registerAllTools } from './tools';
import { createDevProtocolParticipant } from './agent/participant';
import { getWorkspaceRoot } from './utils/workspace';

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

  const openSessionLogCmd = vscode.commands.registerCommand(
    'devprotocol.openSessionLog',
    async () => {
      const wsRoot = getWorkspaceRoot();
      if (!wsRoot) {
        await vscode.window.showErrorMessage('Dev Protocol: No workspace folder open.');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const config = vscode.workspace.getConfiguration('devprotocol');
      const template: string = config.get('sessionLogPath', 'sessions-{date}.md');
      const filename = template.replace('{date}', today);
      const filePath = vscode.Uri.file(path.join(wsRoot, filename));
      try {
        await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(filePath);
      } catch {
        await vscode.window.showWarningMessage(`Session log not found: ${filename}. Use /session to create one.`);
      }
    }
  );

  context.subscriptions.push(...toolDisposables, participant, applyCmd, openSessionLogCmd);

  console.debug('[DevProtocol] Extension activated — tools and participant registered');
}

export function deactivate(): void {
  console.debug('[DevProtocol] Deactivating extension');
}
