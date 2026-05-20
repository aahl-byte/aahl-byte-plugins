#!/usr/bin/env bash
set -euo pipefail

# Resolve PLUGIN_ROOT to the dev-kernel plugin root (parent of scripts/)
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Target project directory — first arg or current directory
TARGET_DIR="${1:-.}"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

# ──────────────────────────────────────────────
# 1. Dependency check: spec-management plugin
# ──────────────────────────────────────────────
PLUGINS_DIR="$(dirname "$PLUGIN_ROOT")"
SPEC_FOUND=false

# Check if manage-specs skill is already installed in the target project
if [[ -f "$TARGET_DIR/.claude/skills/manage-specs/SKILL.md" ]]; then
  SPEC_FOUND=true
fi

# Check if spec-management plugin exists alongside dev-kernel
if [[ -d "$PLUGINS_DIR/spec-management" ]]; then
  SPEC_FOUND=true
fi

if [[ "$SPEC_FOUND" == "false" ]]; then
  echo "✗ Required companion plugin not found: aahl-byte-plugins/spec-management"
  echo "  Install it first:"
  echo "    claude plugin install aahl-byte-plugins/spec-management"
  exit 1
fi

# ──────────────────────────────────────────────
# 2. Copy scripts to target project
# ──────────────────────────────────────────────
mkdir -p "$TARGET_DIR/scripts/dk"
cp "$PLUGIN_ROOT/scripts/dk/launch.ts" "$TARGET_DIR/scripts/dk/launch.ts"
echo "  ✓ scripts/dk/launch.ts"

cp "$PLUGIN_ROOT/scripts/dk/validate.py" "$TARGET_DIR/scripts/dk/validate.py"
echo "  ✓ scripts/dk/validate.py"

mkdir -p "$TARGET_DIR/scripts/comms"
cp "$PLUGIN_ROOT/scripts/comms/ntfy.js" "$TARGET_DIR/scripts/comms/ntfy.js"
echo "  ✓ scripts/comms/ntfy.js"

# ──────────────────────────────────────────────
# 3. Add package.json scripts (if package.json exists)
# ──────────────────────────────────────────────
if [[ -f "$TARGET_DIR/package.json" ]]; then
  node -e "
    const fs = require('fs');
    const path = '$TARGET_DIR/package.json';
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (!pkg.scripts) pkg.scripts = {};

    const toAdd = {
      'dk:launch':   'tsx scripts/dk/launch.ts',
      'dk:validate': 'python3 scripts/dk/validate.py',
      'ntfy':        'node scripts/comms/ntfy.js'
    };

    let added = 0;
    for (const [key, val] of Object.entries(toAdd)) {
      if (!pkg.scripts[key]) {
        pkg.scripts[key] = val;
        added++;
        console.log('  ✓ package.json script: ' + key);
      } else {
        console.log('  – package.json script already present: ' + key);
      }
    }

    if (added > 0) {
      fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
    }
  "
else
  echo "  – No package.json found, skipping script injection"
fi

# ──────────────────────────────────────────────
# 4. Create tmp/initiatives/ and update .gitignore
# ──────────────────────────────────────────────
mkdir -p "$TARGET_DIR/tmp/initiatives"
echo "  ✓ tmp/initiatives/"

if [[ -f "$TARGET_DIR/.gitignore" ]]; then
  if ! grep -qx 'tmp/' "$TARGET_DIR/.gitignore"; then
    echo 'tmp/' >> "$TARGET_DIR/.gitignore"
    echo "  ✓ Added tmp/ to .gitignore"
  else
    echo "  – tmp/ already in .gitignore"
  fi
else
  echo 'tmp/' > "$TARGET_DIR/.gitignore"
  echo "  ✓ Created .gitignore with tmp/"
fi

# ──────────────────────────────────────────────
# Done
# ──────────────────────────────────────────────
echo ""
echo "Done! Run /dk to start your first initiative."
