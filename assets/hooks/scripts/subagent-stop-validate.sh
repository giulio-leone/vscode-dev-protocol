#!/usr/bin/env bash
# Hook: SubagentStop — Validate subagent results + log
# When a subagent completes, logs its output and validates
# that results are coherent with the current plan.
set -euo pipefail

INPUT=$(cat)

SUBAGENT_NAME=$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(d.subagentName || d.agentName || 'unnamed');
" 2>/dev/null <<< "$INPUT" || echo "unnamed")

# Log subagent completion
TODAY=$(date +%Y-%m-%d)
SESSION_FILE="sessions-${TODAY}.md"
TIMESTAMP=$(date +%H:%M:%S)

if [[ -f "$SESSION_FILE" ]]; then
  printf '| %s | SubagentStop | Subagent "%s" completed | ✅ logged |\n' \
    "$TIMESTAMP" "$SUBAGENT_NAME" >> "$SESSION_FILE"
fi

# Provide validation context
printf '{"context": "🤖 Subagent \"%s\" completed at %s. Verify its results are coherent with the current plan before integrating."}' \
  "$SUBAGENT_NAME" "$TIMESTAMP"
