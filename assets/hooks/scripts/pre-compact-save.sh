#!/usr/bin/env bash
# Hook: PreCompact — Save progress before context compaction
# Ensures current plan progress and modified file list are persisted
# before the agent's context window gets compacted.
set -euo pipefail

INPUT=$(cat)

TODAY=$(date +%Y-%m-%d)
SESSION_FILE="sessions-${TODAY}.md"
TIMESTAMP=$(date +%H:%M:%S)

# Log compaction event
if [[ -f "$SESSION_FILE" ]]; then
  printf '\n## Context Compaction at %s\n\n' "$TIMESTAMP" >> "$SESSION_FILE"
fi

# Save current git diff summary
DIFF_STAT=$(git diff --stat 2>/dev/null | tail -1 || echo "no changes")
STAGED_STAT=$(git diff --cached --stat 2>/dev/null | tail -1 || echo "nothing staged")

if [[ -f "$SESSION_FILE" ]]; then
  printf '**Working tree:** %s\n**Staged:** %s\n' "$DIFF_STAT" "$STAGED_STAT" >> "$SESSION_FILE"
fi

# Save plan progress snapshot
if [[ -f ".github/plan.json" ]]; then
  # Count done/total issues
  DONE_COUNT=$(grep -c '"status": "done"' .github/plan.json 2>/dev/null || echo "0")
  TOTAL_COUNT=$(grep -c '"status":' .github/plan.json 2>/dev/null || echo "0")

  if [[ -f "$SESSION_FILE" ]]; then
    printf '**Plan progress:** %s/%s issues done\n' "$DONE_COUNT" "$TOTAL_COUNT" >> "$SESSION_FILE"
  fi

  PLAN_SUMMARY="Plan: ${DONE_COUNT}/${TOTAL_COUNT} issues complete."
else
  PLAN_SUMMARY="No plan.json found."
fi

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

printf '{"context": "📋 Pre-compaction snapshot: Branch=%s, %s, Working tree: %s"}' \
  "$BRANCH" "$PLAN_SUMMARY" "$DIFF_STAT"
