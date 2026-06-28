const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { buildNav } = require('../../host/docsify/build.js');

function tmpCopy() {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'host-'));
  fs.cpSync(path.join(__dirname, 'fixtures', 'sample-notes'), dst, { recursive: true });
  return dst;
}

test('generates _sidebar.md with DOMAIN, PHASE, and site-absolute page links', () => {
  const root = tmpCopy();
  buildNav(root);
  const sb = fs.readFileSync(path.join(root, '_sidebar.md'), 'utf8');
  assert.match(sb, /\*\*global foundation\*\*/);
  assert.match(sb, /\*\*foundation\*\*/);
  assert.match(sb, /\[the event loop\]\(\/global-foundation\/the-event-loop\.md\)/);
});

test('generates _notes-map.json mapping slug to site-absolute path', () => {
  const root = tmpCopy();
  buildNav(root);
  const map = JSON.parse(fs.readFileSync(path.join(root, '_notes-map.json'), 'utf8'));
  assert.equal(map['the-event-loop'], '/global-foundation/the-event-loop.md');
  assert.equal(map['what-is-x'], '/global-foundation/what-is-x.md');
});

test('fills coverpage/home with the manifest title + tagline', () => {
  const root = tmpCopy();
  buildNav(root);
  assert.match(fs.readFileSync(path.join(root, '_coverpage.md'), 'utf8'), /X internals/);
  assert.match(fs.readFileSync(path.join(root, 'home.md'), 'utf8'), /how X actually runs your code/);
});
