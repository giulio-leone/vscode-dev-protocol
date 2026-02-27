#!/usr/bin/env bash
# Hook: PostToolUse — TypeScript type-check on modified files
# After editing a .ts/.tsx file, runs tsc --noEmit to catch type errors immediately.
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

# Only type-check TS files
if ! echo "$FILE_PATH" | grep -qEi "\.ts$|\.tsx$"; then
  echo '{}'
  exit 0
fi

# Skip if no tsconfig.json found
if [[ ! -f "tsconfig.json" ]]; then
  echo '{}'
  exit 0
fi

# Run tsc --noEmit and capture errors
TSC_OUTPUT=$(npx --no-install tsc --noEmit 2>&1 || true)
TSC_EXIT=$?

# Filter errors related to the edited file
FILE_BASENAME=$(basename "$FILE_PATH")
RELEVANT_ERRORS=$(echo "$TSC_OUTPUT" | grep -i "$FILE_BASENAME" 2>/dev/null | head -10 || true)

if [[ -n "$RELEVANT_ERRORS" ]]; then
  ESCAPED_ERRORS=$(echo "$RELEVANT_ERRORS" | sed 's/"/\\"/g' | tr '\n' ' ')
  printf '{"context": "⚠️ TypeScript errors in %s: %s"}' "$FILE_BASENAME" "$ESCAPED_ERRORS"
else
  echo '{}'
fi
