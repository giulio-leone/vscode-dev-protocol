import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreatePlanTool } from '../create-plan';
import { LanguageModelToolResult, LanguageModelTextPart, Uri } from '../../__mocks__/vscode';
import * as fs from 'fs/promises';

vi.mock('vscode', () => import('../../__mocks__/vscode'));
vi.mock('fs/promises');

// Mock workspace root
vi.mock('../../utils/workspace', () => ({
  getWorkspaceRoot: () => '/test/workspace',
}));

const mockContext = {
  extensionUri: Uri.file('/test/extension'),
  subscriptions: [],
};

const sampleMilestones = [
  {
    id: 'M1',
    title: 'Core Architecture',
    priority: 'critical' as const,
    issues: [
      { id: 'M1-i1', task: 'Set up project structure', priority: 'critical' as const, deps: [] },
      { id: 'M1-i2', task: 'Define type interfaces', priority: 'high' as const, deps: ['M1-i1'] },
    ],
  },
  {
    id: 'M2',
    title: 'Feature Implementation',
    priority: 'high' as const,
    issues: [
      { id: 'M2-i1', task: 'Implement user auth', priority: 'critical' as const, deps: ['M1-i1'] },
    ],
  },
];

describe('CreatePlanTool', () => {
  let tool: CreatePlanTool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let writtenPlan: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool = new CreatePlanTool(mockContext as any);

    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
      writtenPlan = JSON.parse(content as string);
    });
  });

  describe('plan structure', () => {
    it('writes a valid plan JSON with PRD and contesto', async () => {
      await tool.invoke(
        {
          input: {
            prd: 'Build a real-time analytics dashboard',
            contesto: 'Branch: feat/dashboard, Stack: React + TypeScript',
            milestones: sampleMilestones,
          },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      expect(writtenPlan.plan.PRD).toBe('Build a real-time analytics dashboard');
      expect(writtenPlan.plan.contesto).toBe('Branch: feat/dashboard, Stack: React + TypeScript');
    });

    it('converts milestones array to a keyed object (id → milestone)', async () => {
      await tool.invoke(
        {
          input: { prd: 'Any PRD', contesto: 'main', milestones: sampleMilestones },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      expect(writtenPlan.plan.milestones).toHaveProperty('M1');
      expect(writtenPlan.plan.milestones).toHaveProperty('M2');
      expect(writtenPlan.plan.milestones.M1.title).toBe('Core Architecture');
      expect(writtenPlan.plan.milestones.M2.title).toBe('Feature Implementation');
    });

    it('converts milestone issues to a keyed object (id → issue)', async () => {
      await tool.invoke(
        {
          input: { prd: 'Any PRD', contesto: 'main', milestones: sampleMilestones },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      const m1Issues = writtenPlan.plan.milestones.M1.issues;
      expect(m1Issues).toHaveProperty('M1-i1');
      expect(m1Issues).toHaveProperty('M1-i2');
      expect(m1Issues['M1-i1'].task).toBe('Set up project structure');
    });

    it('initialises every issue with status "not-started"', async () => {
      await tool.invoke(
        {
          input: { prd: 'Any PRD', contesto: 'main', milestones: sampleMilestones },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      for (const m of Object.values(writtenPlan.plan.milestones) as {
        issues: Record<string, { status: string }>;
      }[]) {
        for (const issue of Object.values(m.issues)) {
          expect(issue.status).toBe('not-started');
        }
      }
    });

    it('preserves dependency references across issues', async () => {
      await tool.invoke(
        {
          input: { prd: 'Any PRD', contesto: 'main', milestones: sampleMilestones },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      expect(writtenPlan.plan.milestones.M1.issues['M1-i2'].deps).toEqual(['M1-i1']);
      expect(writtenPlan.plan.milestones.M2.issues['M2-i1'].deps).toEqual(['M1-i1']);
    });
  });

  describe('file system', () => {
    it('writes to .github/plan.json under workspace root', async () => {
      await tool.invoke(
        {
          input: { prd: 'PRD', contesto: 'ctx', milestones: sampleMilestones },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      const [writePath] = vi.mocked(fs.writeFile).mock.calls[0] as [string, ...unknown[]];
      expect(writePath).toContain('.github');
      expect(writePath).toContain('plan.json');
    });
  });

  describe('return value', () => {
    it('returns a LanguageModelToolResult with a success message', async () => {
      const result = await tool.invoke(
        {
          input: { prd: 'PRD', contesto: 'ctx', milestones: sampleMilestones },
          toolInvocationToken: undefined,
        },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      const text = (result as LanguageModelToolResult).content[0] as LanguageModelTextPart;
      expect(text.value).toContain('plan.json');
    });
  });
});
