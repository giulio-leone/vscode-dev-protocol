import * as vscode from 'vscode';

/**
 * Returns the absolute path of the first workspace folder, or undefined if none is open.
 */
export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
