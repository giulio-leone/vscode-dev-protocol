import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from '../../__mocks__/vscode';

vi.mock('vscode', () => import('../../__mocks__/vscode'));

// Must import AFTER mock is set up
const { getWorkspaceRoot } = await import('../workspace');

describe('getWorkspaceRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined when no workspace folders exist', () => {
    vscode.workspace.workspaceFolders = undefined;
    expect(getWorkspaceRoot()).toBeUndefined();
  });

  it('returns undefined when workspace folders array is empty', () => {
    vscode.workspace.workspaceFolders = [];
    expect(getWorkspaceRoot()).toBeUndefined();
  });

  it('returns the fsPath of the first workspace folder', () => {
    vscode.workspace.workspaceFolders = [
      { uri: vscode.Uri.file('/Users/dev/my-project'), name: 'my-project' },
      { uri: vscode.Uri.file('/Users/dev/second'), name: 'second' },
    ];
    expect(getWorkspaceRoot()).toBe('/Users/dev/my-project');
  });

  it('handles single workspace folder correctly', () => {
    vscode.workspace.workspaceFolders = [
      { uri: vscode.Uri.file('/home/user/workspace'), name: 'workspace' },
    ];
    expect(getWorkspaceRoot()).toBe('/home/user/workspace');
  });
});
