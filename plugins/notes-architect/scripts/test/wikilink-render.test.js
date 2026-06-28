const test = require('node:test');
const assert = require('node:assert');
const { slugify, rewriteWikilinks } = require('../../host/docsify/template/wikilink-render.js');

const MAP = {
  'the-event-loop': '/global-foundation/the-event-loop.md',
  'what-is-x': '/global-foundation/what-is-x.md',
};

test('slugify matches docsify heading anchors', () => {
  assert.equal(slugify('the event loop'), 'the-event-loop');
  assert.equal(slugify('Phases!'), 'phases');
  assert.equal(slugify('2 fast'), '_2-fast');           // digit-prefix guard
});

test('rewrites a bare wikilink to a docsify hash link', () => {
  assert.equal(
    rewriteWikilinks('see [[what-is-x]].', MAP),
    'see [what-is-x](#/global-foundation/what-is-x).'
  );
});

test('rewrites aliased + heading-qualified wikilinks', () => {
  assert.equal(
    rewriteWikilinks('[[the-event-loop|the loop]]', MAP),
    '[the loop](#/global-foundation/the-event-loop)'
  );
  assert.equal(
    rewriteWikilinks('[[the-event-loop#phases|here]]', MAP),
    '[here](#/global-foundation/the-event-loop?id=phases)'
  );
});

test('unknown slug becomes plain text with a marker, never crashes', () => {
  const out = rewriteWikilinks('[[ghost]]', MAP);
  assert.match(out, /ghost/);
  assert.match(out, /unresolved wikilink/);
  assert.ok(!out.includes('](#/'));      // no link emitted for unknown slug
});

test('does not rewrite wikilinks inside fenced code blocks', () => {
  const md = '```\n[[what-is-x]]\n```\nbut [[what-is-x]] outside.';
  const out = rewriteWikilinks(md, MAP);
  assert.ok(out.includes('[[what-is-x]]'));                       // fenced one preserved verbatim
  assert.ok(out.includes('[what-is-x](#/global-foundation/what-is-x)')); // outside one rewritten
});
