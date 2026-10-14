#!/bin/bash
set -euo pipefail
ssh -i "$HOME/.ssh/cloud-gpu" -o BatchMode=yes -o LogLevel=ERROR "$HOST" "setsid -f bash -c 'for i in 1 2 3; do date -u +%T >> /root/keep-smoke/out/tick; sleep 60; done; touch /root/keep-smoke/out/DONE' > /dev/null 2>&1 < /dev/null"
