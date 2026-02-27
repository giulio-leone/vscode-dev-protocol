#!/usr/bin/env bash
# Hook: SubagentStart — Inject plan context into subagent
# When a subagent spawns, injects the current plan.json and branch info
# so the subagent operates with full awareness of the project state.
set -euo pipefail

INPUT=$(cat)

CONTEXT_PARTS=()

# Inject current plan if available
if [[ -f ".github/plan.json" ]]; then
  PLAN=$(cat .github/plan.json)
  CONTEXT_PARTS+=("## Active Plan\n${PLAN}")
fi

# Inject branch info
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
CONTEXT_PARTS+=("## Git Context\n**Branch:** ${BRANCH}")

# Inject protocol rules summary
CONTEXT_PARTS+=("## Protocol Rules for Subagent
- Follow KISS, DRY, SOLID principles
- No workarounds — only structural solutions
- Document-first: consult official docs before implementing
- Report back findings in structured format")

# Build context
FULL_CONTEXT=""
for part in "${CONTEXT_PARTS[@]}"; do
  FULL_CONTEXT="${FULL_CONTEXT}\n${part}\n"
done

printf '{"context": "%s"}' "$(echo -e "$FULL_CONTEXT" | sed 's/"/\\"/g' | tr '\n' ' ')"
