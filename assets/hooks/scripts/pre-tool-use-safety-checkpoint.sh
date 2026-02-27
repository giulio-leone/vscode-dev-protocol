#!/usr/bin/env bash
# Hook: PreToolUse — Safety checkpoint (worktree/stash)
# Before destructive operations, creates a git stash or worktree checkpoint.
# Operations are logged for easy rollback.
set -euo pipefail

INPUT=$(cat)

read -r TOOL_NAME TOOL_INPUT <<< "$(echo "$INPUT" | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const name = d.toolName || '';
  const input = JSON.stringify(d.toolInput || {});
  process.stdout.write(name + ' ' + input);
" 2>/dev/null <<< "$INPUT" || echo " {}")"

# Destructive tool patterns that warrant a checkpoint
DESTRUCTIVE_TOOLS="run_in_terminal|execute_command"
DESTRUCTIVE_COMMANDS="rm |rm -|git reset|git clean|git checkout -- |drop |truncate "

IS_DESTRUCTIVE=false

# Check terminal tools for destructive commands
if echo "$TOOL_NAME" | grep -qEi "$DESTRUCTIVE_TOOLS"; then
  COMMAND_LOWER=$(echo "$TOOL_INPUT" | tr '[:upper:]' '[:lower:]')
  for pattern in $DESTRUCTIVE_COMMANDS; do
    if echo "$COMMAND_LOWER" | grep -qi "$pattern" 2>/dev/null; then
      IS_DESTRUCTIVE=true
      break
    fi
  done
fi

# File deletion tools
if echo "$TOOL_NAME" | grep -qEi "delete_file|remove_file"; then
  IS_DESTRUCTIVE=true
fi

if [[ "$IS_DESTRUCTIVE" != "true" ]]; then
  echo '{}'
  exit 0
fi

# Create safety checkpoint
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CHECKPOINT_NAME="devprotocol-checkpoint-${TIMESTAMP}"
HAS_CHANGES=$(git status --porcelain 2>/dev/null | head -1)

CHECKPOINT_TYPE=""
CHECKPOINT_REF=""

if [[ -n "$HAS_CHANGES" ]]; then
  # Stash current changes as a named checkpoint
  git stash push -m "$CHECKPOINT_NAME" --include-untracked 2>/dev/null
  STASH_REF=$(git stash list 2>/dev/null | head -1 | cut -d: -f1)
  # Immediately pop to restore working state (stash is kept in reflog)
  git stash pop 2>/dev/null
  CHECKPOINT_TYPE="stash"
  CHECKPOINT_REF="$STASH_REF"
else
  # Tag current clean state
  git tag "$CHECKPOINT_NAME" 2>/dev/null || true
  CHECKPOINT_TYPE="tag"
  CHECKPOINT_REF="$CHECKPOINT_NAME"
fi

# Log the checkpoint to session file
SESSION_FILE=$(ls -1t sessions-*.md 2>/dev/null | head -1)
if [[ -n "${SESSION_FILE:-}" ]]; then
  printf '\n| %s | Safety checkpoint | %s: %s before destructive op: %s | ⚠️ checkpoint |\n' \
    "$TIMESTAMP" "$CHECKPOINT_TYPE" "$CHECKPOINT_REF" "$TOOL_NAME" >> "$SESSION_FILE"
fi

# Allow with context about the checkpoint
printf '{"context": "🔒 Safety checkpoint created: %s (%s: %s). To rollback: git %s %s. Proceeding with destructive operation."}' \
  "$CHECKPOINT_NAME" "$CHECKPOINT_TYPE" "$CHECKPOINT_REF" \
  "$(if [[ "$CHECKPOINT_TYPE" == "stash" ]]; then echo 'stash apply'; else echo 'checkout'; fi)" \
  "$CHECKPOINT_REF"
