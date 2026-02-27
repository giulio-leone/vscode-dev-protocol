import * as vscode from 'vscode';
import { AskQuestionsTool } from './ask-questions';
import { CreatePlanTool } from './create-plan';
import { LogSessionTool } from './log-session';
import { CreateBranchTool } from './create-branch';
import { DocumentFirstTool } from './document-first';
import { EnforceQualityTool } from './enforce-quality';
import { ApplyInstructionsTool } from './apply-instructions';
import { RunSubagentTool } from './run-subagent';

export function registerAllTools(context: vscode.ExtensionContext): vscode.Disposable[] {
  return [
    vscode.lm.registerTool('devprotocol_ask_questions', new AskQuestionsTool()),
    vscode.lm.registerTool('devprotocol_create_plan', new CreatePlanTool(context)),
    vscode.lm.registerTool('devprotocol_log_session', new LogSessionTool(context)),
    vscode.lm.registerTool('devprotocol_create_branch', new CreateBranchTool(context)),
    vscode.lm.registerTool('devprotocol_document_first', new DocumentFirstTool()),
    vscode.lm.registerTool('devprotocol_enforce_quality', new EnforceQualityTool()),
    vscode.lm.registerTool('devprotocol_apply_instructions', new ApplyInstructionsTool(context)),
    vscode.lm.registerTool('devprotocol_run_subagent', new RunSubagentTool()),
  ];
}
