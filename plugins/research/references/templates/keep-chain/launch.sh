#!/bin/bash
# Start the chain detached at nice 19 with this box's job count. KEEP_DONE is written only when the chain exits cleanly,
# so a crash, a kill or a reclaim never ends the keep chain early. A memory logger runs beside it.
set -euo pipefail
R=<PROJECT_ROOT>/<spikes>/<id>
ssh -i "$HOME/.ssh/cloud-gpu" -o BatchMode=yes -o LogLevel=ERROR "$HOST" "cd $R && rm -f results/chain/KEEP_DONE && setsid -f bash -c 'exec nice -n 19 bash -c \"env JOBS=$JOBS bash run_chain.sh && touch results/chain/KEEP_DONE\"' >> remote_chain.log 2>&1 < /dev/null && setsid -f bash boxmem/memlog.sh >> boxmem/mem.log 2>&1 < /dev/null"
