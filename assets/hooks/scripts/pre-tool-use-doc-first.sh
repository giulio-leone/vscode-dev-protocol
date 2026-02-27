#!/usr/bin/env bash
# Hook: PreToolUse — Document-first enforcer
# Before create_file on new source modules, verifies that documentation
# or Context7 MCP was consulted. Adds a reminder if not.
set -euo pipefail

INPUT=$(cat)

read -r TOOL_NAME FILE_PATH <<< "$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const name = d.toolName || '';
  const input = d.toolInput || {};
  const fp = input.filePath || input.path || '';
  process.stdout.write(name + ' ' + fp);
" 2>/dev/null <<< "$INPUT" || echo " ")"

# Only check create_file operations
if [[ "$TOOL_NAME" != "create_file" ]]; then
  echo '{}'
  exit 0
fi

# Only check source code files (skip configs, docs, tests, assets)
SOURCE_EXTENSIONS="\.ts$|\.tsx$|\.js$|\.jsx$|\.py$|\.rs$|\.go$"
if ! echo "$FILE_PATH" | grep -qEi "$SOURCE_EXTENSIONS"; then
  echo '{}'
  exit 0
fi

# Skip test files
if echo "$FILE_PATH" | grep -qEi "__tests__|\.test\.|\.spec\.|test/|tests/"; then
  echo '{}'
  exit 0
fi

# Inject document-first reminder as context
printf '{"context": "📖 DOCUMENT-FIRST REMINDER: Before creating new source modules, ensure you have consulted official documentation via Context7 MCP (resolve-library-id → query-docs) or by reading existing files. Priority: 1) Context7 MCP 2) Read existing code 3) Web search 4) Never assume."}'
