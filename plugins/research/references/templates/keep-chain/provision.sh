#!/bin/bash
# Once per new box: the shared environment, any inherited spikes, the data, then this spike from the pulled state.
# gpu keep sets HOST (root@...), CLUSTER, JOBS, INSTANCE_TYPE, SPOT and KEEP_NAME, and runs this from the SPEC's directory.
set -euo pipefail
cd <PROJECT_ROOT>
<provision the environment on "$HOST": rebuild it from a lock file, or copy a self-contained env to the same absolute path>
rsync -a -e "ssh -i $HOME/.ssh/cloud-gpu -o BatchMode=yes" <data and inherited paths> <spikes>/<id> "$HOST:<PROJECT_ROOT>/"
