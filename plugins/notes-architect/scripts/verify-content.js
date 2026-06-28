'use strict';
const fs = require('fs');
const path = require('path');
const { readManifest, flattenPages } = require('./lib/manifest.js');

function verifyContent(root, opts = {}) {
  const errors = [], warnings = [];
  const manifestPath = path.join(root, 'structure.yaml');
  if (!fs.existsSync(manifestPath)) {
    return { errors: [`[manifest] structure.yaml missing at ${root}`], warnings, pageCount: 0 };
  }
  const manifest = readManifest(manifestPath);
  const pages = opts.overridePages || flattenPages(manifest);

  const seen = new Map();
  for (const p of pages) {
    if (seen.has(p.slug)) errors.push(`[slug] duplicate slug "${p.slug}" (${p.path} and ${seen.get(p.slug)})`);
    else seen.set(p.slug, p.path);
  }

  const onDisk = walkMd(root);
  const manifestPaths = new Set(pages.map(p => path.resolve(root, p.path)));
  for (const p of pages) {
    const abs = path.resolve(root, p.path);
    if (!fs.existsSync(abs)) { errors.push(`[page] ${p.path} in manifest but file missing`); continue; }
    const first = fs.readFileSync(abs, 'utf8').split(/\r?\n/, 1)[0];
    if (/globals\.css/.test(first)) errors.push(`[host-leak] ${p.path} starts with a docsify stylesheet line; content must be host-independent`);
  }

  for (const f of onDisk) {
    if (!manifestPaths.has(path.resolve(f))) errors.push(`[orphan] ${path.relative(root, f)} is not listed in structure.yaml`);
  }

  return { errors, warnings, pageCount: pages.length };
}

function walkMd(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

module.exports = { verifyContent, walkMd };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || 'notes');
  const { errors, pageCount } = verifyContent(root);
  console.log(`content-verified ${pageCount} page(s) under ${path.relative(process.cwd(), root)}/`);
  if (errors.length) { console.error(`\n✗ ${errors.length} problem(s):`); errors.forEach(e => console.error(`  ✗ ${e}`)); process.exit(1); }
  console.log('✓ all content checks passed');
}
