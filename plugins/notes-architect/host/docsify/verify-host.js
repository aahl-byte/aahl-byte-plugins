#!/usr/bin/env node
'use strict';

/*
 * verify-host.js [site-root]   (default: notes)
 *
 * Validates a BUILT docsify site — a notes root that holds the content
 * (structure.yaml + pages), the host shell (index.html, css/globals.css,
 * .nojekyll, search.md) and the generated nav (_sidebar.md, _notes-map.json,
 * _coverpage.md, _navbar.md, home.md).
 *
 * Checks:
 *   [shell]  index.html exists and references ./css/globals.css
 *   [shell]  every required generated/host file exists
 *   [orphan] every manifest page is linked from _sidebar.md
 *   [map]    _notes-map.json slugs and manifest slugs agree
 *
 * Exits non-zero if any check fails. No dependencies (Node built-ins only).
 */

const fs = require('fs');
const path = require('path');
const { readManifest, flattenPages } = require('../../scripts/lib/manifest.js');

// markdown links to .md targets, ignoring titles/anchors
const LINK_RE = /\]\(([^)"'#]+\.md)/g;

const REQUIRED_FILES = [
  '_sidebar.md',
  '_notes-map.json',
  '.nojekyll',
  'search.md',
  '_coverpage.md',
  '_navbar.md',
  'home.md',
  'css/globals.css',
];

function verifyHost(root) {
  const errors = [];
  const warnings = [];

  // ── 1. index.html shell ─────────────────────────────────────────────────
  const indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) {
    errors.push('[shell] index.html missing at site root');
  } else {
    const html = fs.readFileSync(indexPath, 'utf8');
    if (!html.includes('./css/globals.css')) {
      errors.push('[shell] index.html does not reference ./css/globals.css');
    }
  }

  // ── 2. required generated/host files ────────────────────────────────────
  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(root, rel))) {
      errors.push(`[shell] ${rel} missing at site root`);
    }
  }

  // ── content manifest (needed for coverage + map checks) ─────────────────
  const manifestPath = path.join(root, 'structure.yaml');
  if (!fs.existsSync(manifestPath)) {
    errors.push('[shell] structure.yaml missing at site root');
    return { errors, warnings };
  }
  const manifest = readManifest(manifestPath);
  const pages = flattenPages(manifest);

  // ── 3. sidebar coverage ─────────────────────────────────────────────────
  const sidebarPath = path.join(root, '_sidebar.md');
  if (fs.existsSync(sidebarPath)) {
    const sidebar = fs.readFileSync(sidebarPath, 'utf8');
    const linked = new Set();
    let m;
    while ((m = LINK_RE.exec(sidebar)) !== null) {
      const t = m[1];
      const resolved = t.startsWith('/')
        ? path.join(root, t.replace(/^\/+/, ''))
        : path.resolve(root, t);
      linked.add(path.resolve(resolved));
    }
    for (const page of pages) {
      const abs = path.resolve(root, page.path);
      if (!linked.has(abs)) {
        errors.push(`[orphan] ${page.path} is not linked from _sidebar.md`);
      }
    }
  }

  // ── 4. notes-map integrity ──────────────────────────────────────────────
  const mapPath = path.join(root, '_notes-map.json');
  if (fs.existsSync(mapPath)) {
    let map;
    try {
      map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    } catch (e) {
      errors.push(`[map] _notes-map.json is not valid JSON: ${e.message}`);
      map = null;
    }
    if (map) {
      const manifestSlugs = new Set(pages.map((p) => p.slug));
      const mapSlugs = new Set(Object.keys(map));
      for (const slug of mapSlugs) {
        if (!manifestSlugs.has(slug)) {
          errors.push(`[map] _notes-map.json has slug "${slug}" not in structure.yaml`);
        }
      }
      for (const slug of manifestSlugs) {
        if (!mapSlugs.has(slug)) {
          errors.push(`[map] manifest slug "${slug}" missing from _notes-map.json`);
        }
      }
    }
  }

  return { errors, warnings };
}

module.exports = { verifyHost };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || 'notes');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`✗ site root not found: ${root}`);
    process.exit(1);
  }
  const { errors, warnings } = verifyHost(root);
  console.log(`host-verified built site at ${path.relative(process.cwd(), root) || '.'}/`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (errors.length) {
    console.error(`\n✗ ${errors.length} problem(s):`);
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
  console.log('✓ all host checks passed');
}
