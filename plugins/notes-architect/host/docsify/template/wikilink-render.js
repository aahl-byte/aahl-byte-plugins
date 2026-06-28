(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NotesWikilinks = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // mirrors docsify core's slugify so wikilink heading anchors match real anchors.
  // The punctuation range is written with EXPLICIT UNICODE ESCAPES on purpose:
  //  -⁯ (general punctuation) and ⸀-⹿ (supplemental
  // punctuation). Transcribing those as literal characters accidentally starts
  // the range at U+0020 (ASCII space), which would strip ASCII letters and
  // collapse every heading anchor to '' (the bug this module also fixes in
  // notesSearch's inline slugify).
  function slugify(text) {
    return String(text).toLowerCase().trim()
      .replace(/<[^>]+>/g, '')
      .replace(/[ -⁯⸀-⹿\\'!\"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-')
      .replace(/-+/g, '-')
      .replace(/^(\d)/, '_$1');
  }

  // [[slug]] | [[slug|alias]] | [[slug#heading]] | [[slug#heading|alias]]
  var WIKILINK_RE = /\[\[([^\]\|#]+)(?:#([^\]\|]+))?(?:\|([^\]]+))?\]\]/g;

  function rewriteLine(line, map) {
    return line.replace(WIKILINK_RE, function (raw, slug, heading, alias) {
      slug = slug.trim();
      var text = (alias != null ? alias : slug).trim();
      var p = map[slug];
      if (!p) return text + '<!-- unresolved wikilink: ' + slug + ' -->';
      var target = p.replace(/^\//, '').replace(/\.md$/, '');
      var anchor = heading ? ('?id=' + slugify(heading.trim())) : '';
      return '[' + text + '](#/' + target + anchor + ')';
    });
  }

  // skip fenced code blocks so literal [[...]] in code stays verbatim
  function rewriteWikilinks(md, map) {
    var inFence = false;
    return String(md).split('\n').map(function (line) {
      if (/^```/.test(line.trim())) { inFence = !inFence; return line; }
      if (inFence) return line;
      return rewriteLine(line, map || {});
    }).join('\n');
  }

  return { slugify: slugify, rewriteWikilinks: rewriteWikilinks, WIKILINK_RE: WIKILINK_RE };
});
