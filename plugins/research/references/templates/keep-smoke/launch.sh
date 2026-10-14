#!/bin/bash
# Starts the dummy job detached, then fails unless it returned within seconds and the job outlived its ssh.
set -euo pipefail
SSH=(ssh -i "$HOME/.ssh/cloud-gpu" -o BatchMode=yes -o LogLevel=ERROR "$HOST")
start=$(date +%s)
"${SSH[@]}" "setsid -f bash -c 'echo \$\$ > /root/keep-smoke/pid; for i in 1 2 3; do date -u +%T > /root/keep-smoke/out/tick-\$i; sleep 60; done; touch /root/keep-smoke/out/DONE' > /dev/null 2>&1 < /dev/null"
took=$(( $(date +%s) - start ))
echo "launch hook returned in ${took}s"
[ "$took" -le 30 ] || { echo "FAIL: launch hook held its ssh open for ${took}s" >&2; exit 1; }
sleep 2
"${SSH[@]}" 'kill -0 "$(cat /root/keep-smoke/pid)"' || { echo "FAIL: job died with the launch ssh" >&2; exit 1; }
