#!/usr/bin/env bash
# Hook: SessionStart — Load project context + validate branch
# Injects plan.json, session file, and .instructions.md into agent context.
# Validates we're on a feature branch with clean working tree.
set -euo pipefail

INPUT=$(cat)

CONTEXT_PARTS=()

# Load plan.json if it exists
if [[ -f ".github/plan.json" ]]; then
  PLAN=$(cat .github/plan.json)
  CONTEXT_PARTS+=("## Current Plan (from .github/plan.json)\n${PLAN}")
fi

# Load latest session file
LATEST_SESSION=$(ls -1t sessions-*.md 2>/dev/null | head -1)
if [[ -n "${LATEST_SESSION:-}" ]]; then
  SESSION_CONTENT=$(cat "$LATEST_SESSION")
  CONTEXT_PARTS+=("## Latest Session (${LATEST_SESSION})\n${SESSION_CONTENT}")
fi

# Load .instructions.md files
if [[ -d ".github/instructions" ]]; then
  for f in .github/instructions/*.instructions.md; do
    [[ -f "$f" ]] || continue
    NAME=$(basename "$f")
    CONTENT=$(cat "$f")
    CONTEXT_PARTS+=("## Instruction: ${NAME}\n${CONTENT}")
  done
fi

# Branch validation
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_STATUS=$(git status --porcelain 2>/dev/null || echo "")
WARNINGS=""

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  WARNINGS="⚠️ WARNING: On ${CURRENT_BRANCH} branch. Create a feature branch before making changes."
fi

if [[ -n "$GIT_STATUS" ]]; then
  DIRTY_COUNT=$(echo "$GIT_STATUS" | wc -l | tr -d ' ')
  WARNINGS="${WARNINGS}\n⚠️ Working tree has ${DIRTY_COUNT} uncommitted change(s)."
fi

# Build context block
FULL_CONTEXT="# Dev Protocol — Session Context\n\n**Branch:** ${CURRENT_BRANCH}"
if [[ -n "$WARNINGS" ]]; then
  FULL_CONTEXT="${FULL_CONTEXT}\n${WARNINGS}"
fi
for part in "${CONTEXT_PARTS[@]}"; do
  FULL_CONTEXT="${FULL_CONTEXT}\n\n---\n${part}"
done

# Output: add context to agent
printf '{"context": "%s"}' "$(echo -e "$FULL_CONTEXT" | sed 's/"/\\"/g' | tr '\n' ' ')"
