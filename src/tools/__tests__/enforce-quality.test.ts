import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnforceQualityTool } from '../enforce-quality';
import { LanguageModelToolResult, LanguageModelTextPart, CancellationTokenSource } from '../../__mocks__/vscode';

// Align the mock return type with what LanguageModelToolResult provides
vi.mock('vscode', () => import('../../__mocks__/vscode'));

function makeToken() {
  return new CancellationTokenSource().token;
}

async function invoke(tool: EnforceQualityTool, proposedSolution: string, problemStatement: string) {
  const result = await tool.invoke(
    {
      input: { proposedSolution, problemStatement },
      toolInvocationToken: undefined,
    },
    makeToken()
  );
  const text = (result as LanguageModelToolResult).content[0] as LanguageModelTextPart;
  return JSON.parse(text.value) as { pass: boolean; violations: string[]; recommendation: string };
}

describe('EnforceQualityTool', () => {
  let tool: EnforceQualityTool;

  beforeEach(() => {
    tool = new EnforceQualityTool();
  });

  describe('pass cases', () => {
    it('passes a clean structural solution', async () => {
      const result = await invoke(
        tool,
        'Refactor the Auth class by extracting a TokenValidator using the Strategy pattern.',
        'Authentication token validation is scattered across multiple components'
      );
      expect(result.pass).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.recommendation).toContain('✅');
    });

    it('passes code using unknown type with type guard', async () => {
      const result = await invoke(
        tool,
        'function isUser(val: unknown): val is User { return typeof val === "object" && val !== null && "id" in val; }',
        'Type-safe user validation'
      );
      expect(result.pass).toBe(true);
    });
  });

  describe('workaround detection', () => {
    it.each([
      ['// TODO fix later — just patch this for now', 'TODO.*fix later'],
      ['// HACK: bypass validation temporarily', 'hack'],
      ['// workaround for upstream bug', 'workaround'],
      ['// band-aid fix until we refactor', 'band.?aid'],
      ['// temporary solution', 'temporary'],
      ['// quick fix to ship tonight', 'quick.?fix'],
      ['// patch existing behavior', 'patch'],
      ['// bypass auth check for demo', 'bypass'],
    ])('detects "%s"', async (code, _desc) => {
      const result = await invoke(tool, code, 'Some problem');
      expect(result.pass).toBe(false);
      expect(result.violations.some((v) => v.includes('Workaround detected'))).toBe(true);
    });
  });

  describe('TypeScript `any` detection', () => {
    it('fails on `: any` annotation', async () => {
      const result = await invoke(tool, 'function process(data: any) { return data; }', 'Process data');
      expect(result.pass).toBe(false);
      expect(result.violations.some((v) => v.includes('`any` type'))).toBe(true);
    });

    it('fails on `as any` cast', async () => {
      const result = await invoke(tool, 'const val = response.data as any;', 'Cast response');
      expect(result.pass).toBe(false);
      expect(result.violations.some((v) => v.includes('`any` type'))).toBe(true);
    });

    it('fails on generic `<any>`', async () => {
      const result = await invoke(tool, 'const list = new Array<any>();', 'Create array');
      expect(result.pass).toBe(false);
      expect(result.violations.some((v) => v.includes('`any` type'))).toBe(true);
    });
  });

  describe('SOLID anti-pattern detection', () => {
    it('detects god class comment', async () => {
      const result = await invoke(tool, '// This is a god class that handles everything', 'Refactor monolith');
      expect(result.pass).toBe(false);
      expect(result.violations.some((v) => v.includes('Single Responsibility'))).toBe(true);
    });

    it('detects large switch statement', async () => {
      // Must be single-line: the regex uses .* which does not cross newlines
      const code = "switch (action) { case 'A': break; case 'B': break; case 'C': break; case 'D': break; }";
      const result = await invoke(tool, code, 'Handle actions');
      expect(result.pass).toBe(false);
      expect(result.violations.some((v) => v.includes('Strategy pattern'))).toBe(true);
    });
  });

  describe('multiple violations', () => {
    it('reports all violations when multiple patterns match', async () => {
      const code = 'function hack(data: any) { /* TODO fix later */ return data as any; }';
      const result = await invoke(tool, code, 'Multiple issues');
      expect(result.pass).toBe(false);
      // hack + TODO fix later + any (multiple detections)
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
      expect(result.recommendation).toContain('❌');
      expect(result.recommendation).toContain('Violations:');
    });
  });

  describe('prepareInvocation', () => {
    it('returns the correct invocation message', () => {
      const prepared = tool.prepareInvocation(
        { input: { proposedSolution: '', problemStatement: '' } },
        makeToken()
      );
      expect(prepared?.invocationMessage).toBe('Running quality gate check...');
    });
  });
});
