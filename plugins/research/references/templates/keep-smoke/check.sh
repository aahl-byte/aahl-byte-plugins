#!/bin/bash
# Run after `gpu keep run spec.yaml` ends. Passes only if a pull landed while the job was still running:
# tick-1 is written once, and rsync leaves an unchanged file alone, so its local ctime is the pull that first
# brought it home, while DONE keeps the box's mtime from the moment the job finished.
set -euo pipefail
cd "$(dirname "$0")"
for f in out/tick-1 out/tick-2 out/tick-3 out/DONE; do [ -e "$f" ] || { echo "FAIL: $f never came home" >&2; exit 1; }; done
landed=$(stat -c %Z out/tick-1); finished=$(stat -c %Y out/DONE)
[ $(( finished - landed )) -ge 30 ] || { echo "FAIL: tick-1 came home $(( landed - finished ))s after the job finished; no pull landed mid-run" >&2; exit 1; }
echo "PASS: a pull landed $(( finished - landed ))s before the job finished"
