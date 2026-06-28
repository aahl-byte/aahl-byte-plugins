const test = require('node:test');
const assert = require('node:assert');
const { parseWikilinks } = require('../lib/wikilinks.js');

test('parses bare, aliased, and heading-qualified wikilinks', () => {
  const md = 'see [[the-event-loop|the loop]] and [[what-is-x]] and [[the-event-loop#phases|here]].';
  const links = parseWikilinks(md);
  assert.deepEqual(links, [
    { slug: 'the-event-loop', heading: null, alias: 'the loop', raw: '[[the-event-loop|the loop]]' },
    { slug: 'what-is-x', heading: null, alias: null, raw: '[[what-is-x]]' },
    { slug: 'the-event-loop', heading: 'phases', alias: 'here', raw: '[[the-event-loop#phases|here]]' },
  ]);
});

test('ignores wikilinks inside fenced code blocks', () => {
  const md = '```\n[[not-a-link]]\n```\nbut [[real]] counts.';
  assert.deepEqual(parseWikilinks(md).map(l => l.slug), ['real']);
});
