#!/usr/bin/env bash
# Hook: PreToolUse — Auto-select recommended option in devprotocol_ask_questions
# When devprotocol.autoSelectRecommended is enabled, this hook adds context
# instructing the agent that the recommended option was auto-selected.
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(d.toolName || '');
" 2>/dev/null <<< "$INPUT" || echo "")

# Only act on devprotocol_ask_questions
if [[ "$TOOL_NAME" != "devprotocol_ask_questions" ]]; then
  echo '{}'
  exit 0
fi

# Check if auto-select setting is enabled via env or config
# The extension sets DEVPROTOCOL_AUTO_SELECT=1 when the setting is on
if [[ "${DEVPROTOCOL_AUTO_SELECT:-0}" == "1" ]]; then
  printf '{"context": "Auto-select mode is ON. The recommended (⭐) option will be chosen automatically without user interaction. Proceed with the recommended option as the selected answer."}'
else
  echo '{}'
fi
