#!/usr/bin/env bash
# Hook: PreToolUse — Security gate
# Blocks dangerous terminal commands: rm -rf, git push --force, DROP TABLE,
# chmod 777, mkfs, dd if=, and other destructive operations.
set -euo pipefail

INPUT=$(cat)

# Parse tool name and input
read -r TOOL_NAME TOOL_INPUT <<< "$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const name = d.toolName || '';
  const input = JSON.stringify(d.toolInput || {});
  process.stdout.write(name + ' ' + input);
" 2>/dev/null <<< "$INPUT" || echo " {}")"

# Only check terminal/command execution tools
TERMINAL_TOOLS="run_in_terminal|execute_command|terminal"
if ! echo "$TOOL_NAME" | grep -qEi "$TERMINAL_TOOLS"; then
  echo '{}'
  exit 0
fi

# Dangerous patterns (case-insensitive grep)
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf \*"
  "rm -rf ~"
  "git push.*--force[^-]"
  "git push.*-f "
  "git reset --hard"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE TABLE"
  "chmod 777"
  "chmod -R 777"
  "mkfs\."
  "dd if="
  ":(){ :|:& };:"
  "> /dev/sda"
  "curl.*| bash"
  "curl.*| sh"
  "wget.*| bash"
  "wget.*| sh"
  "--no-verify"
)

COMMAND_STR=$(echo "$TOOL_INPUT" | tr '[:upper:]' '[:lower:]')

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  PATTERN_LOWER=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')
  if echo "$COMMAND_STR" | grep -qi "$PATTERN_LOWER" 2>/dev/null; then
    printf '{"decision": "deny", "reason": "🛑 SECURITY: Dangerous command blocked by Dev Protocol security hook. Pattern matched: %s. If you need to perform this operation, disable the security hook temporarily or get explicit user approval first."}' "$pattern"
    exit 0
  fi
done

# Allow
echo '{}'
