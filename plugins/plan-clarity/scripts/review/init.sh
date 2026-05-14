#!/usr/bin/env bash
# Usage: init.sh <name>
# Scaffolds a review directory at docs/review/<name>/ from the plugin template

set -euo pipefail

NAME="${1:?Usage: init.sh <name>}"

# Resolve plugin root: prefer CLAUDE_PLUGIN_ROOT, fall back to relative from this script
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  PLUGIN_ROOT="$CLAUDE_PLUGIN_ROOT"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PLUGIN_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
fi

TEMPLATE_DIR="$PLUGIN_ROOT/template/review"
TARGET_DIR="docs/review/$NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Error: $TARGET_DIR already exists"
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp -r "$TEMPLATE_DIR"/. "$TARGET_DIR"/

# Remove dev artifacts from the copy
rm -rf "$TARGET_DIR/node_modules" "$TARGET_DIR/dist"

# Create dynamic subdirectories for hybrid facets
mkdir -p "$TARGET_DIR/dynamic/logic" "$TARGET_DIR/dynamic/data" "$TARGET_DIR/dynamic/layout"

# Copy validate script so the build works standalone
mkdir -p "$TARGET_DIR/scripts"
cp "$PLUGIN_ROOT/scripts/review/validate.js" "$TARGET_DIR/scripts/validate.js"

cd "$TARGET_DIR"
bun install

echo "Ready: $TARGET_DIR"
echo "Next: agents will write *.config.yaml and dynamic/*.svelte, then run 'bun run build'"
