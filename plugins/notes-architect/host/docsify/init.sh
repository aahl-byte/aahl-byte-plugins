#!/usr/bin/env bash
# Usage: init.sh [site-root]
# Scaffolds a self-contained docsify study-notes site at <site-root> (default: notes)
# from the plugin template. No build step — docsify renders the markdown client-side.

set -euo pipefail

SITE_ROOT="${1:-notes}"

# Resolve plugin root: prefer CLAUDE_PLUGIN_ROOT, fall back to relative from this script
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  PLUGIN_ROOT="$CLAUDE_PLUGIN_ROOT"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
fi

TEMPLATE_DIR="$PLUGIN_ROOT/host/docsify/template"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: template not found at $TEMPLATE_DIR"
  exit 1
fi

if [ -d "$SITE_ROOT" ] && [ -f "$SITE_ROOT/index.html" ]; then
  echo "Error: a site already exists at $SITE_ROOT/ (index.html present)."
  echo "       Add pages to it instead, or pass a different site-root."
  exit 1
fi

mkdir -p "$SITE_ROOT"
# Copy template contents, including dotfiles like .nojekyll
cp -r "$TEMPLATE_DIR"/. "$SITE_ROOT"/

echo "Ready: $SITE_ROOT/"
echo "  index.html, css/globals.css, search.md, .nojekyll"
echo ""
echo "Next (host):"
echo "  1. run the docsify build step to generate nav + landing from structure.yaml"
echo "  2. run the host verify step to validate the built site"
echo "  3. preview: cd $SITE_ROOT && python3 -m http.server 8080  (then open the URL)"
