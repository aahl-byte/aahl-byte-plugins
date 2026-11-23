#!/bin/sh
# End-to-end probe: a fresh Claude Code session with this plugin loaded regenerates the page.
# Uses one short `claude -p` call. Exit 0 when .claude/env-map/index.html appears, 1 otherwise.
set -u
plugin="$(cd "$(dirname "$0")/.." && pwd)"
project="$(mktemp -d "${TMPDIR:-/tmp}/env-map-e2e-XXXXXX")"
git -C "$project" init -q
printf '# probe\n' > "$project/CLAUDE.md"
page="$project/.claude/env-map/index.html"
(cd "$project" && claude -p --plugin-dir "$plugin" "Reply with the single word ok." < /dev/null > "$project/claude-output.txt" 2>&1)
echo "claude exited $?: $(head -c 200 "$project/claude-output.txt")"
i=0
while [ ! -f "$page" ] && [ "$i" -lt 30 ]; do
  sleep 1
  i=$((i + 1))
done
if [ -f "$page" ]; then
  echo "PASS: $page written by the SessionStart hook"
  exit 0
fi
echo "FAIL: no $page after the session started"
exit 1
