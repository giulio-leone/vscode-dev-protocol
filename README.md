# Dev Protocol — VS Code Extension

Universal developer workflow protocol as a VS Code extension. Install once, use everywhere.

## Features

### @devprotocol Chat Agent

Talk to `@devprotocol` in any GitHub Copilot chat:

| Command | Description |
|---|---|
| `@devprotocol /plan <task>` | Start an iterative planning session |
| `@devprotocol /session` | Log current session progress |
| `@devprotocol /apply` | Copy bundled instructions to workspace |
| `@devprotocol /review` | Review current plan progress |

### 8 LM Tools (available to ALL Copilot agents)

Once installed, these tools are available everywhere in Copilot — not just with `@devprotocol`:

| Tool | Description |
|---|---|
| `devprotocol_ask_questions` | 4-option choice loop (3 concrete + 1 freeform, best marked) |
| `devprotocol_create_plan` | Generate Zod JSON plan → `.github/plan.json` |
| `devprotocol_log_session` | Create/update `sessions-{date}.md` |
| `devprotocol_create_branch` | Protocol-compliant git branching with clean-tree validation |
| `devprotocol_document_first` | Context7 MCP documentation lookup guidance |
| `devprotocol_enforce_quality` | KISS/DRY/SOLID/Hexagonal quality gate |
| `devprotocol_apply_instructions` | Copy bundled `.instructions.md` to workspace |
| `devprotocol_run_subagent` | Structured subagent delegation |

### Bundled Instructions

`@devprotocol /apply` copies these to your workspace's `.github/instructions/`:

- **workflow.instructions.md** — planning, branching, #askQuestions loop, no workarounds
- **architecture.instructions.md** — Hexagonal, TypeScript strict, Lit, naming conventions
- **testing.instructions.md** — Vitest, happy-dom, Chrome API stubs, adapter patterns

## The Protocol

The Dev Protocol enforces a consistent development workflow:

1. **Iterative clarification** — Always uses 4-option choices (3 concrete + 1 freeform), loops until explicit confirmation
2. **Zod JSON planning** — Every non-trivial task starts with a structured plan with milestones and issues
3. **Branch per milestone** — Isolates work on dedicated branches (`feat/`, `fix/`, `chore/`, `docs/`)
4. **Document-first** — Fetches official docs via Context7 MCP before implementing
5. **Quality gates** — Rejects workarounds; mandates structural, permanent solutions
6. **Session logging** — Tracks progress in `sessions-YYYY-MM-DD.md`
7. **Parallel execution** — Uses subagents for maximum efficiency

## Requirements

- VS Code 1.95+
- GitHub Copilot (Chat)

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `devprotocol.askQuestionsStyle` | `chat` | Choice presentation: `chat` or `quickpick` |
| `devprotocol.planOutputPath` | `.github/plan.json` | Where to save plan files |
| `devprotocol.sessionLogPath` | `sessions-{date}.md` | Session log file template |
| `devprotocol.autoApplyInstructions` | `false` | Auto-apply on workspace open |

## Development

```bash
npm install          # Install dependencies
npm run build        # Development build
npm run build:prod   # Production build
npm run dev          # Watch mode
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run test         # Vitest
npm run package      # Create .vsix
npm run publish      # Publish to Marketplace
```

## License

MIT
