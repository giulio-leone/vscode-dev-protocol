import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AskQuestionsTool } from '../ask-questions';
import { LanguageModelToolResult, LanguageModelTextPart } from '../../__mocks__/vscode';
import * as vscode from '../../__mocks__/vscode';

vi.mock('vscode', () => import('../../__mocks__/vscode'));

const mockToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

const sampleOptions = [
  { label: 'Use Hexagonal Architecture', description: 'Ports & adapters', recommended: true },
  { label: 'Use MVC', description: 'Classic pattern' },
  { label: 'Use Clean Architecture', description: 'Uncle Bob pattern' },
] as const;

type InvokeResult = { selected: string[]; freeText: string | null; skipped: boolean; autoSelected?: boolean };

async function invokeAndParse(
  tool: AskQuestionsTool,
  options: typeof sampleOptions,
  autoSelect = false
): Promise<InvokeResult> {
  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
    get: vi.fn(<T>(_key: string, defaultValue?: T) => {
      if (_key === 'autoSelectRecommended') return autoSelect as unknown as T;
      return defaultValue as T;
    }),
    has: vi.fn(() => false),
    inspect: vi.fn(),
    update: vi.fn(),
  } as unknown as ReturnType<typeof vscode.workspace.getConfiguration>);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await tool.invoke(
    { input: { question: 'Which architecture?', options: [...options] }, toolInvocationToken: undefined },
    mockToken
  );

  const text = (result as LanguageModelToolResult).content[0] as LanguageModelTextPart;
  return JSON.parse(text.value) as InvokeResult;
}

describe('AskQuestionsTool', () => {
  let tool: AskQuestionsTool;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new AskQuestionsTool();
  });

  describe('auto-select mode (autoSelectRecommended: true)', () => {
    it('returns the recommended option without showing a QuickPick', async () => {
      const result = await invokeAndParse(tool, sampleOptions, true);

      expect(result.autoSelected).toBe(true);
      expect(result.selected).toEqual(['Use Hexagonal Architecture']);
      expect(result.freeText).toBeNull();
      expect(result.skipped).toBe(false);
      expect(vscode.window.createQuickPick).not.toHaveBeenCalled();
    });

    it('falls back to QuickPick when no option is marked recommended', async () => {
      const optionsWithoutRecommended = [
        { label: 'Option A' },
        { label: 'Option B' },
        { label: 'Option C' },
      ] as const;

      // Set up QuickPick mock that resolves immediately via onDidHide
      const qp = {
        title: '',
        placeholder: '',
        items: [] as vscode.QuickPickItem[],
        canSelectMany: false,
        selectedItems: [] as vscode.QuickPickItem[],
        onDidAccept: vi.fn(),
        onDidHide: vi.fn((cb: () => void) => {
          cb();
          return { dispose: vi.fn() };
        }),
        show: vi.fn(),
        dispose: vi.fn(),
      };
      vi.mocked(vscode.window.createQuickPick).mockReturnValue(qp);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await invokeAndParse(tool, optionsWithoutRecommended as any, true);

      // Should fall through to QuickPick since no recommended option exists
      expect(vscode.window.createQuickPick).toHaveBeenCalled();
    });
  });

  describe('manual QuickPick mode (autoSelectRecommended: false)', () => {
    it('creates a QuickPick when auto-select is disabled', async () => {
      const qp = {
        title: '',
        placeholder: '',
        items: [] as vscode.QuickPickItem[],
        canSelectMany: false,
        selectedItems: [] as vscode.QuickPickItem[],
        onDidAccept: vi.fn((_cb: () => void) => ({ dispose: vi.fn() })),
        onDidHide: vi.fn((_cb: () => void) => {
          _cb(); // Immediately resolve (simulates user closing QuickPick)
          return { dispose: vi.fn() };
        }),
        show: vi.fn(),
        dispose: vi.fn(),
      };
      vi.mocked(vscode.window.createQuickPick).mockReturnValue(qp);

      await invokeAndParse(tool, sampleOptions, false);

      expect(vscode.window.createQuickPick).toHaveBeenCalledOnce();
      expect(qp.show).toHaveBeenCalled();
    });

    it('sets the QuickPick title from the question', async () => {
      const qp = {
        title: '',
        placeholder: '',
        items: [],
        canSelectMany: false,
        selectedItems: [],
        onDidAccept: vi.fn(),
        onDidHide: vi.fn((_cb: () => void) => {
          _cb();
          return { dispose: vi.fn() };
        }),
        show: vi.fn(),
        dispose: vi.fn(),
      };
      vi.mocked(vscode.window.createQuickPick).mockReturnValue(qp);

      await invokeAndParse(tool, sampleOptions, false);

      expect(qp.title).toBe('Which architecture?');
    });
  });
});
