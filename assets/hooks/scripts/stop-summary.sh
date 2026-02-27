#!/usr/bin/env bash
# Hook: Stop — Auto-generate session summary
# When the agent session ends, creates a comprehensive summary
# in the session file with all progress, changes, and next steps.
set -euo pipefail

INPUT=$(cat)

TODAY=$(date +%Y-%m-%d)
SESSION_FILE="sessions-${TODAY}.md"
TIMESTAMP=$(date +%H:%M:%S)

# Collect session stats
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "no commits")

# Modified files since session start (approximate: files modified today)
MODIFIED_TODAY=$(git log --since="$TODAY" --name-only --pretty=format: 2>/dev/null | sort -u | grep -v '^$' | head -20 || echo "none")
MODIFIED_COUNT=$(echo "$MODIFIED_TODAY" | grep -c '.' 2>/dev/null || echo "0")

# Plan progress
PLAN_STATUS="No plan found"
if [[ -f ".github/plan.json" ]]; then
  DONE=$(grep -c '"status": "done"' .github/plan.json 2>/dev/null || echo "0")
  TOTAL=$(grep -c '"status":' .github/plan.json 2>/dev/null || echo "0")
  IN_PROGRESS=$(grep -c '"status": "in-progress"' .github/plan.json 2>/dev/null || echo "0")
  PLAN_STATUS="${DONE}/${TOTAL} done, ${IN_PROGRESS} in-progress"
fi

# Write session end summary
if [[ ! -f "$SESSION_FILE" ]]; then
  printf '# Session Log — %s\n\n' "$TODAY" > "$SESSION_FILE"
fi

cat >> "$SESSION_FILE" << EOF

---

## Session End Summary — ${TIMESTAMP}

| Metric | Value |
|---|---|
| Branch | ${BRANCH} |
| Last commit | ${LAST_COMMIT} |
| Total commits | ${COMMIT_COUNT} |
| Files modified | ${MODIFIED_COUNT} |
| Plan progress | ${PLAN_STATUS} |

### Files Modified
$(echo "$MODIFIED_TODAY" | sed 's/^/- /')

### Next Steps
_[Review plan.json for pending issues]_
EOF

printf '{"context": "📝 Session summary saved to %s. Branch: %s, Plan: %s, Files: %s modified."}' \
  "$SESSION_FILE" "$BRANCH" "$PLAN_STATUS" "$MODIFIED_COUNT"
