import * as vscode from 'vscode';

interface AskQuestionsInput {
  readonly question: string;
  readonly header?: string;
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly description?: string;
    readonly recommended?: boolean;
  }>;
}

interface AskQuestionsResult {
  readonly selected: string[];
  readonly freeText: string | null;
  readonly skipped: boolean;
}

/**
 * LM Tool: devprotocol_ask_questions
 *
 * Presents structured choices with exactly 4 options (3 concrete + 1 freeform),
 * with the best future-proof option marked. Used to enforce the iterative
 * interactive protocol with the user.
 */
export class AskQuestionsTool implements vscode.LanguageModelTool<AskQuestionsInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<AskQuestionsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { question, header, options: choices } = options.input;

    // Build QuickPick items: first 3 concrete options + 1 freeform
    const qpItems: vscode.QuickPickItem[] = choices.map((opt, idx) => ({
      label: opt.label,
      description: opt.description ?? '',
      detail: opt.recommended ? '★ Best (future-proof)' : undefined,
      picked: opt.recommended === true && idx === 0,
    }));

    // Always append freeform option
    qpItems.push({
      label: '✏️ Freeform — enter your own answer',
      description: 'Type your own response',
    });

    const qp = vscode.window.createQuickPick();
    qp.title = header ?? question;
    qp.placeholder = question;
    qp.items = qpItems;
    qp.canSelectMany = false;

    const selected = await new Promise<vscode.QuickPickItem | undefined>((resolve) => {
      qp.onDidAccept(() => {
        resolve(qp.selectedItems[0]);
        qp.dispose();
      });
      qp.onDidHide(() => {
        resolve(undefined);
        qp.dispose();
      });
      qp.show();
    });

    if (!selected) {
      const result: AskQuestionsResult = { selected: [], freeText: null, skipped: true };
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result)),
      ]);
    }

    let freeText: string | null = null;
    const isFreeform = selected.label.startsWith('✏️ Freeform');

    if (isFreeform) {
      freeText = await vscode.window.showInputBox({
        prompt: question,
        placeHolder: 'Enter your answer...',
      }) ?? null;
    }

    const result: AskQuestionsResult = {
      selected: isFreeform ? [] : [selected.label],
      freeText,
      skipped: false,
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<AskQuestionsInput>,
    _token: vscode.CancellationToken
  ): vscode.PreparedToolInvocation {
    return {
      invocationMessage: `Asking: ${options.input.question}`,
    };
  }
}
