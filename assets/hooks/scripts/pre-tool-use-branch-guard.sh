#!/usr/bin/env bash
# Hook: PreToolUse — Branch guard
# Prevents file creation/editing on main/master branch.
# Forces agent to create a feature branch first.
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log(d.toolName || '');
" 2>/dev/null <<< "$INPUT" || echo "")

# Only guard file-mutation tools
FILE_TOOLS="create_file|replace_string_in_file|multi_replace_string_in_file|edit_file|write_file"
if ! echo "$TOOL_NAME" | grep -qEi "$FILE_TOOLS"; then
  echo '{}'
  exit 0
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  printf '{"decision": "deny", "reason": "🚫 BRANCH GUARD: Cannot edit files on %s. Create a feature branch first (feat/, fix/, chore/, docs/ prefix) using devprotocol_create_branch, then switch to it before making changes."}' "$CURRENT_BRANCH"
  exit 0
fi

# Allow
echo '{}'
