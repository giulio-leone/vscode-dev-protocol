#!/usr/bin/env bash
# Hook: UserPromptSubmit — Protocol enforcer + prompt quality gate
# Injects protocol reminders and rejects overly vague prompts.
set -euo pipefail

INPUT=$(cat)

# Extract the user prompt text
PROMPT=$(echo "$INPUT" | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(data.prompt || data.userPrompt || '');
" 2>/dev/null <<< "$INPUT" || echo "")

# Quality gate: reject prompts shorter than 10 characters (too vague)
PROMPT_LEN=${#PROMPT}
if [[ $PROMPT_LEN -gt 0 && $PROMPT_LEN -lt 10 ]]; then
  printf '{"decision": "deny", "reason": "Prompt too vague (%d chars). Be specific about what you need: describe the task, context, and expected outcome."}' "$PROMPT_LEN"
  exit 0
fi

# Protocol enforcer: inject reminders as context
REMINDERS="## Dev Protocol Reminders
- Use #askQuestions for every decision (4 options: 3 concrete + 1 freeform, best marked ⭐)
- Create a Zod JSON plan (.github/plan.json) before starting non-trivial work
- Document-first: consult Context7 MCP or official docs before implementing
- No workarounds: only structural, permanent, future-proof solutions
- Branch per milestone: feat/, fix/, chore/, docs/ prefixes
- Log progress in sessions-{date}.md"

printf '{"context": "%s"}' "$(echo "$REMINDERS" | sed 's/"/\\"/g' | tr '\n' ' ')"
