#!/usr/bin/env bash
# Print upstream pstack's changes since the commit recorded in UPSTREAM.
#
# Usage: upstream-diff.sh [--log] [git-diff-args...] [-- <path>...]
#   --log       print the upstream commit list instead of the diff
#   extra args  pass through to git diff, e.g. --stat or -- skills/arena
#
# Keeps a blobless clone in ${PSTACK_UPSTREAM_CACHE:-~/.cache/pstack-upstream}.
# After pulling changes in, set `commit:` in UPSTREAM to the sha printed on the first line.
set -euo pipefail

plugin_dir=$(cd "$(dirname "$0")/.." && pwd)
field() { sed -n "s/^$1: *//p" "$plugin_dir/UPSTREAM"; }
repo=$(field repo)
path=$(field path)
since=$(field commit)
cache=${PSTACK_UPSTREAM_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/pstack-upstream}

if [ ! -d "$cache/.git" ]; then
	git clone --quiet --filter=blob:none --no-checkout "$repo" "$cache"
fi
git -C "$cache" fetch --quiet origin
head=$(git -C "$cache" rev-parse origin/HEAD)

echo "# upstream $repo $path: $since..$head"
if [ "${1:-}" = "--log" ]; then
	shift
	git -C "$cache" log --oneline "$since..$head" -- "$path" "$@"
	exit 0
fi

paths=()
args=()
while [ $# -gt 0 ]; do
	if [ "$1" = "--" ]; then
		shift
		for p in "$@"; do paths+=("$path/$p"); done
		break
	fi
	args+=("$1")
	shift
done
[ ${#paths[@]} -gt 0 ] || paths=("$path")

git -C "$cache" diff "${args[@]}" "$since" "$head" -- "${paths[@]}"
