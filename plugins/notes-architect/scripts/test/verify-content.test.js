const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { verifyContent } = require('../verify-content.js');

const FIX = path.join(__dirname, 'fixtures', 'sample-notes');

function mutatedFixture(relPath, appendText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-content-'));
  fs.cpSync(FIX, tmp, { recursive: true });
  const target = path.join(tmp, relPath);
  fs.appendFileSync(target, appendText);
  return tmp;
}

test('clean fixture passes with no errors', () => {
  const { errors } = verifyContent(FIX);
  assert.deepEqual(errors, []);
});

test('flags a manifest page whose file is missing', () => {
  const { errors } = verifyContent(FIX, {
    overridePages: [{ slug: 'ghost', title: 'ghost', path: 'global-foundation/ghost.md', domain: 'd', phase: 'p' }],
  });
  assert.ok(errors.some(e => /ghost\.md/.test(e) && /missing/.test(e)));
});

test('flags a dangling wikilink to a non-existent slug', () => {
  const tmp = mutatedFixture('global-foundation/what-is-x.md', '\n\nsee [[no-such-slug]].\n');
  const { errors } = verifyContent(tmp);
  assert.ok(errors.some(e => /\[wikilink\]/.test(e) && /no-such-slug/.test(e)), errors.join('\n'));
});

test('flags a wikilink to a heading that does not exist on the target', () => {
  const tmp = mutatedFixture('global-foundation/what-is-x.md', '\n\nsee [[the-event-loop#nope]].\n');
  const { errors } = verifyContent(tmp);
  assert.ok(errors.some(e => /\[wikilink\]/.test(e) && /heading/.test(e)), errors.join('\n'));
});

test('flags a footnote reference with no definition', () => {
  const tmp = mutatedFixture('global-foundation/what-is-x.md', '\n\na claim with a footnote.[^9]\n');
  const { errors } = verifyContent(tmp);
  assert.ok(errors.some(e => /\[footnote\]/.test(e)), errors.join('\n'));
});
