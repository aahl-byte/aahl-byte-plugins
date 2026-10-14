#!/bin/bash
# On a replacement box: push what the old box's last pulls brought home since provisioning.
set -euo pipefail
cd <PROJECT_ROOT>
rsync -a -e "ssh -i $HOME/.ssh/cloud-gpu -o BatchMode=yes" <spikes>/<id> "$HOST:<PROJECT_ROOT>/<spikes>/"
