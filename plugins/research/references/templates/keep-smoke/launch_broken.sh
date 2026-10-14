#!/bin/bash
# The launch bug the smoke test must catch: the job is backgrounded without setsid or redirects, so the ssh stays open until it ends.
set -euo pipefail
SSH=(ssh -i "$HOME/.ssh/cloud-gpu" -o BatchMode=yes -o LogLevel=ERROR "$HOST")
start=$(date +%s)
"${SSH[@]}" "echo \$\$ > /root/keep-smoke/pid; (for i in 1 2 3; do date -u +%T > /root/keep-smoke/out/tick-\$i; sleep 60; done && touch /root/keep-smoke/out/DONE) &"
took=$(( $(date +%s) - start ))
echo "launch hook returned in ${took}s"
[ "$took" -le 30 ] || { echo "FAIL: launch hook held its ssh open for ${took}s" >&2; exit 1; }
