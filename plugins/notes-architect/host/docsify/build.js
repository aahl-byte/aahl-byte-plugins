'use strict';
const fs = require('fs');
const path = require('path');
const { readManifest, flattenPages } = require('../../scripts/lib/manifest.js');

const GEN = '<!-- generated from structure.yaml by na-host-docsify — do not edit by hand -->';

function buildSidebar(manifest) {
  const lines = [GEN, ''];
  for (const domain of manifest.domains) {
    let head = `- **${domain.name}**`;
    if (domain.caption) head += ` <small>${domain.caption}</small>`;
    lines.push(head);
    if (domain.phases && domain.phases.length) {
      for (const phase of domain.phases) {
        lines.push(`  - **${phase.name}**`);
        for (const pg of phase.pages || []) {
          lines.push(`    - [${pg.title}](/${pg.path})`);
        }
      }
    } else {
      for (const pg of domain.pages || []) {
        lines.push(`  - [${pg.title}](/${pg.path})`);
      }
    }
  }
  lines.push('');
  lines.push('- **&nbsp;**');
  lines.push('  - [search](/search.md)');
  lines.push('');
  return lines.join('\n');
}

function buildCoverpage(title, tagline) {
  const quote = tagline || 'outcome first. analogy before jargon. specifics last.';
  return `${GEN}

# ${title}

> ${quote}

notes built **onion-first** — stop at any depth and still hold a true mental model.

[start reading](/home.md)
[search](/search.md)
`;
}

function buildNavbar() {
  return `${GEN}

- [home](/home.md)
- [search](/search.md)
`;
}

function buildHome(title, tagline) {
  const taglineLine = tagline ? `\n${tagline}\n` : '';
  return `<link rel="stylesheet" href="./css/globals.css">

# ${title}
${taglineLine}
these are living study notes. they're built to give you a <em>mental model</em> first
and the fine print last — so you can stop at any depth and still understand the shape
of things.

## how these notes are structured

they're an onion. each layer is true on its own; peel inward for more detail.

- **foundation** — the mental model: what this is, in plain language.
- **building blocks** — the moving parts: what each piece is *for*, and when you'd
  reach for it.
- **cross-cutting** — the concerns that span the parts: tradeoffs, pitfalls, and
  "use this instead of that, because…".
- **synthesis** — putting it together: worked examples and how real systems combine
  the pieces.

## where to start

- new here? read top-to-bottom from **foundation**.
- already oriented? jump to the **building block** you need.
- looking for something specific? use [search](./search.md).
`;
}

function buildNav(root) {
  const manifest = readManifest(path.join(root, 'structure.yaml'));
  const map = Object.fromEntries(flattenPages(manifest).map((p) => [p.slug, '/' + p.path]));

  fs.writeFileSync(path.join(root, '_sidebar.md'), buildSidebar(manifest));
  fs.writeFileSync(path.join(root, '_notes-map.json'), JSON.stringify(map, null, 2));
  fs.writeFileSync(path.join(root, '_coverpage.md'), buildCoverpage(manifest.title, manifest.tagline));
  fs.writeFileSync(path.join(root, '_navbar.md'), buildNavbar());
  fs.writeFileSync(path.join(root, 'home.md'), buildHome(manifest.title, manifest.tagline));
}

module.exports = { buildNav };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || 'notes');
  buildNav(root);
  console.log('generated docsify nav + landing from structure.yaml into ' + root);
}
