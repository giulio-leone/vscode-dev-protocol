#!/usr/bin/env bash
# Hook: PostToolUse — Change logger
# Logs every file mutation to the current session file for full traceability.
set -euo pipefail

INPUT=$(cat)

read -r TOOL_NAME FILE_PATH <<< "$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const name = d.toolName || '';
  const input = d.toolInput || {};
  const fp = input.filePath || input.path || '';
  process.stdout.write(name + ' ' + fp);
" 2>/dev/null <<< "$INPUT" || echo " ")"

# Only log file-mutation tools
FILE_TOOLS="create_file|replace_string_in_file|multi_replace_string_in_file|edit_file|delete_file"
if ! echo "$TOOL_NAME" | grep -qEi "$FILE_TOOLS"; then
  echo '{}'
  exit 0
fi

# Find or create session file
TODAY=$(date +%Y-%m-%d)
SESSION_FILE="sessions-${TODAY}.md"

if [[ ! -f "$SESSION_FILE" ]]; then
  printf '# Session Log — %s\n\n## Change Log\n\n| Time | Tool | File | Branch |\n|---|---|---|---|\n' "$TODAY" > "$SESSION_FILE"
fi

TIMESTAMP=$(date +%H:%M:%S)
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
FILE_BASENAME=$(basename "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")

# Append change entry
printf '| %s | %s | %s | %s |\n' "$TIMESTAMP" "$TOOL_NAME" "$FILE_BASENAME" "$BRANCH" >> "$SESSION_FILE"

echo '{}'
