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

TEMPLATE_DIR="$PLUGIN_ROOT/template/site"

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
echo "  index.html, css/globals.css, _sidebar.md, _navbar.md, _coverpage.md,"
echo "  home.md, search.md, .nojekyll"
echo ""
echo "Next (architect):"
echo "  1. create section folders under $SITE_ROOT/ per the approved outline"
echo "  2. write _sidebar.md / home.md / _coverpage.md / _navbar.md / CLAUDE.md"
echo "  3. delegate one notes-author agent per page (parallel)"
echo "  4. node \$CLAUDE_PLUGIN_ROOT/scripts/verify.js $SITE_ROOT"
echo ""
echo "Preview: cd $SITE_ROOT && python3 -m http.server 8080  (then open the URL)"
