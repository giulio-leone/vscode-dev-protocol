import { vi } from 'vitest';

// ─── Core value objects ────────────────────────────────────────────────────

export class Uri {
  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }
  static joinPath(base: Uri, ...segments: string[]): Uri {
    const joined = [base.fsPath, ...segments].join('/');
    return new Uri(joined);
  }
  constructor(public readonly fsPath: string) {}
}

export class CancellationTokenSource {
  token: CancellationToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
  cancel = vi.fn();
  dispose = vi.fn();
}

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested: ReturnType<typeof vi.fn>;
}

// ─── LM Tool result types ──────────────────────────────────────────────────

export class LanguageModelTextPart {
  constructor(public readonly value: string) {}
}

export class LanguageModelToolResult {
  constructor(public readonly content: LanguageModelTextPart[]) {}
}

// ─── QuickPick ─────────────────────────────────────────────────────────────

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

const mockQuickPick = {
  title: '',
  placeholder: '',
  items: [] as QuickPickItem[],
  canSelectMany: false,
  selectedItems: [] as QuickPickItem[],
  onDidAccept: vi.fn((_cb: () => void) => ({ dispose: vi.fn() })),
  onDidHide: vi.fn((_cb: () => void) => ({ dispose: vi.fn() })),
  show: vi.fn(),
  dispose: vi.fn(),
};

// ─── workspace ─────────────────────────────────────────────────────────────

const mockConfiguration = {
  get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined => defaultValue),
  has: vi.fn(() => false),
  inspect: vi.fn(),
  update: vi.fn(),
};

export const workspace = {
  workspaceFolders: undefined as { uri: Uri; name: string }[] | undefined,
  getConfiguration: vi.fn((_section?: string) => mockConfiguration),
  onDidChangeWorkspaceFolders: vi.fn(),
};

// ─── window ────────────────────────────────────────────────────────────────

export const window = {
  showErrorMessage: vi.fn(() => Promise.resolve(undefined)),
  showWarningMessage: vi.fn(() => Promise.resolve(undefined)),
  showInformationMessage: vi.fn(() => Promise.resolve(undefined)),
  createQuickPick: vi.fn(() => ({ ...mockQuickPick })),
  showTextDocument: vi.fn(() => Promise.resolve(undefined)),
};

// ─── commands ──────────────────────────────────────────────────────────────

export const commands = {
  registerCommand: vi.fn((_id: string, _cb: (...args: unknown[]) => unknown) => ({
    dispose: vi.fn(),
  })),
  executeCommand: vi.fn(() => Promise.resolve(undefined)),
};

// ─── chat ──────────────────────────────────────────────────────────────────

export const chat = {
  createChatParticipant: vi.fn(() => ({
    iconPath: undefined,
    dispose: vi.fn(),
  })),
};

// ─── lm tools ──────────────────────────────────────────────────────────────

export const lm = {
  registerTool: vi.fn(() => ({ dispose: vi.fn() })),
  selectChatModels: vi.fn(() => Promise.resolve([])),
};

// ─── Extension context ─────────────────────────────────────────────────────

export function makeMockExtensionContext(extensionPath: string): {
  extensionUri: Uri;
  subscriptions: { dispose(): void }[];
  extension: { packageJSON: { version: string } };
} {
  return {
    extensionUri: Uri.file(extensionPath),
    subscriptions: [],
    extension: { packageJSON: { version: '0.1.0' } },
  };
}

// ─── Language model tool interfaces ────────────────────────────────────────

export type ChatParticipantToolToken = symbol;

export interface LanguageModelToolInvocationOptions<T> {
  input: T;
  toolInvocationToken: ChatParticipantToolToken | undefined;
}

export interface LanguageModelToolInvocationPrepareOptions<T> {
  input: T;
}

export interface PreparedToolInvocation {
  invocationMessage: string;
}

// ─── Disposable ────────────────────────────────────────────────────────────

export class Disposable {
  static from(...disposables: { dispose(): void }[]): Disposable {
    return new Disposable(() => disposables.forEach((d) => d.dispose()));
  }
  constructor(private readonly _callOnDispose: () => void) {}
  dispose(): void {
    this._callOnDispose();
  }
}

// ─── LanguageModelTool interface (structural, no runtime code) ─────────────

export interface LanguageModelTool<T> {
  invoke(options: LanguageModelToolInvocationOptions<T>, token: CancellationToken): Promise<LanguageModelToolResult>;
  prepareInvocation?(
    options: LanguageModelToolInvocationPrepareOptions<T>,
    token: CancellationToken
  ): PreparedToolInvocation | undefined;
}
