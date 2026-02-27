#!/usr/bin/env bash
# Hook: PostToolUse — Auto-format with prettier + eslint
# After file creation/editing on TS/JS files, runs prettier --write and eslint --fix.
set -euo pipefail

INPUT=$(cat)

read -r TOOL_NAME FILE_PATH <<< "$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const name = d.toolName || '';
  const input = d.toolInput || {};
  const fp = input.filePath || input.path || '';
  process.stdout.write(name + ' ' + fp);
" 2>/dev/null <<< "$INPUT" || echo " ")"

# Only run after file-mutation tools
FILE_TOOLS="create_file|replace_string_in_file|multi_replace_string_in_file|edit_file"
if ! echo "$TOOL_NAME" | grep -qEi "$FILE_TOOLS"; then
  echo '{}'
  exit 0
fi

# Only format TS/JS/JSON files
FORMATTABLE="\.ts$|\.tsx$|\.js$|\.jsx$|\.json$|\.css$|\.html$"
if ! echo "$FILE_PATH" | grep -qEi "$FORMATTABLE"; then
  echo '{}'
  exit 0
fi

# Skip if file doesn't exist
if [[ ! -f "$FILE_PATH" ]]; then
  echo '{}'
  exit 0
fi

FORMATTED=false

# Run prettier if available
if command -v npx &>/dev/null; then
  if npx --no-install prettier --check "$FILE_PATH" &>/dev/null; then
    : # Already formatted
  else
    npx --no-install prettier --write "$FILE_PATH" 2>/dev/null && FORMATTED=true
  fi
fi

# Run eslint --fix if available (only for JS/TS)
if echo "$FILE_PATH" | grep -qEi "\.ts$|\.tsx$|\.js$|\.jsx$"; then
  if command -v npx &>/dev/null; then
    npx --no-install eslint --fix "$FILE_PATH" 2>/dev/null && FORMATTED=true
  fi
fi

if [[ "$FORMATTED" == "true" ]]; then
  printf '{"context": "✨ Auto-formatted %s with prettier/eslint."}' "$(basename "$FILE_PATH")"
else
  echo '{}'
fi
