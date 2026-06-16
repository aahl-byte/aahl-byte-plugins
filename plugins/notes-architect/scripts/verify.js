#!/usr/bin/env node
'use strict';

/*
 * verify.js [site-root]   (default: notes)
 *
 * Enforces the notes-architect house rules before publishing:
 *   1. every content page's first line is the stylesheet link
 *   2. every relative cross-link resolves to a file that exists
 *   3. every content page appears in _sidebar.md (no orphans), and every
 *      sidebar link points to a real file
 *
 * Exits non-zero if any check fails. No dependencies.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || 'notes');
const STYLESHEET_LINE = '<link rel="stylesheet" href="./css/globals.css">';

// Nav/config files are exempt from the content-page rules.
const NAV_FILES = new Set(['_sidebar.md', '_navbar.md', '_coverpage.md']);

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`✗ site root not found: ${ROOT}`);
  process.exit(1);
}

// ── collect markdown files ──────────────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const allMd = walk(ROOT);
const contentPages = allMd.filter((f) => !NAV_FILES.has(path.basename(f)));

// ── 1. first line is the stylesheet link ────────────────────────────────
for (const file of contentPages) {
  const firstLine = fs.readFileSync(file, 'utf8').split(/\r?\n/, 1)[0].trim();
  if (firstLine !== STYLESHEET_LINE) {
    fail(`[stylesheet] ${rel(file)} — first line must be exactly:\n            ${STYLESHEET_LINE}\n            got: ${firstLine || '(empty)'}`);
  }
}

// ── 2. relative cross-links resolve ─────────────────────────────────────
// matches markdown links [text](target) and bare href="target"
const LINK_RE = /(?:\]\(|href=")([^)"'#]+\.md)(?:[)"#])/g;
for (const file of allMd) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    const target = m[1];
    if (/^(https?:)?\/\//.test(target)) continue; // external
    let resolved;
    if (target.startsWith('/')) {
      // site-absolute (nav files) — resolve from ROOT
      resolved = path.join(ROOT, target.replace(/^\/+/, ''));
    } else {
      // relative — resolve from the file's directory
      resolved = path.resolve(path.dirname(file), target);
    }
    if (!fs.existsSync(resolved)) {
      fail(`[link] ${rel(file)} → ${target} (resolves to ${rel(resolved)}, missing)`);
    }
  }
}

// ── 3. sidebar coverage ─────────────────────────────────────────────────
const sidebarPath = path.join(ROOT, '_sidebar.md');
if (!fs.existsSync(sidebarPath)) {
  fail('[sidebar] _sidebar.md is missing');
} else {
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');
  const linked = new Set();
  let m;
  const re = /\]\(([^)"'#]+\.md)/g;
  while ((m = re.exec(sidebar)) !== null) {
    const t = m[1];
    const resolved = t.startsWith('/')
      ? path.join(ROOT, t.replace(/^\/+/, ''))
      : path.resolve(ROOT, t);
    linked.add(path.resolve(resolved));
  }

  // every content page (except home + search, which the nav/cover reach) should be linked
  const EXEMPT = new Set(['home.md', 'search.md']);
  for (const page of contentPages) {
    if (EXEMPT.has(path.basename(page))) continue;
    if (!linked.has(path.resolve(page))) {
      fail(`[orphan] ${rel(page)} is not linked from _sidebar.md`);
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────
function rel(p) { return path.relative(process.cwd(), p); }

console.log(`verified ${contentPages.length} content page(s) under ${rel(ROOT)}/`);
for (const w of warnings) console.log(`  ⚠ ${w}`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('✓ all checks passed');
