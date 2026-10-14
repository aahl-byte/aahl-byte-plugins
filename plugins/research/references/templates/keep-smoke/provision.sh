#!/bin/bash
set -euo pipefail
ssh -i "$HOME/.ssh/cloud-gpu" -o BatchMode=yes -o LogLevel=ERROR -o StrictHostKeyChecking=accept-new "$HOST" "mkdir -p /root/keep-smoke/out"
