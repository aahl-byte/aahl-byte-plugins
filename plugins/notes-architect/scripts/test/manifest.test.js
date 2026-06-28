const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { readManifest, flattenPages } = require('../lib/manifest.js');

const FIX = path.join(__dirname, 'fixtures', 'sample-notes', 'structure.yaml');

test('readManifest parses title, tagline, domains, phases, pages', () => {
  const m = readManifest(FIX);
  assert.equal(m.title, 'X internals');
  assert.equal(m.tagline, 'how X actually runs your code');
  assert.equal(m.domains.length, 1);
  assert.equal(m.domains[0].name, 'global foundation');
  assert.equal(m.domains[0].caption, 'the lay of the land');
  assert.equal(m.domains[0].phases.length, 2);
  assert.equal(m.domains[0].phases[0].pages[0].slug, 'what-is-x');
});

test('flattenPages yields every page with domain/phase context', () => {
  const pages = flattenPages(readManifest(FIX));
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map(p => p.slug), ['what-is-x', 'the-event-loop']);
  assert.equal(pages[1].domain, 'global foundation');
  assert.equal(pages[1].phase, 'building blocks');
  assert.equal(pages[1].path, 'global-foundation/the-event-loop.md');
});

test('phase-less domain lists pages directly under the domain', () => {
  const yaml = [
    'title: "tiny"',
    'domains:',
    '  - name: "global foundation"',
    '    pages:',
    '      - slug: "intro"',
    '        title: "intro"',
    '        path: "intro.md"',
    '      - slug: "details"',
    '        title: "details"',
    '        path: "details.md"',
    '',
  ].join('\n');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-')), 'structure.yaml');
  fs.writeFileSync(f, yaml);
  const m = readManifest(f);
  assert.equal(m.domains[0].phases.length, 0);
  assert.deepEqual(m.domains[0].pages.map(p => p.slug), ['intro', 'details']);
  const pages = flattenPages(m);
  assert.deepEqual(pages.map(p => p.slug), ['intro', 'details']);
  assert.equal(pages[0].phase, '');
});
