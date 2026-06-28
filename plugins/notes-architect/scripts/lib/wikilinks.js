'use strict';

// [[slug]] | [[slug|alias]] | [[slug#heading]] | [[slug#heading|alias]]
const WIKILINK_RE = /\[\[([^\]\|#]+)(?:#([^\]\|]+))?(?:\|([^\]]+))?\]\]/g;

function parseWikilinks(md) {
  const out = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    let m;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(line)) !== null) {
      out.push({ slug: m[1].trim(), heading: m[2] ? m[2].trim() : null, alias: m[3] ? m[3].trim() : null, raw: m[0] });
    }
  }
  return out;
}

// docsify-compatible heading slug (mirrors the slugify in the docsify index.html)
function slugifyHeading(text) {
  return text.toLowerCase().trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-').replace(/-+/g, '-').replace(/^(\d)/, '_$1');
}

function headingSlugsIn(md) {
  const slugs = new Set();
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) slugs.add(slugifyHeading(h[1].trim()));
  }
  return slugs;
}

module.exports = { parseWikilinks, slugifyHeading, headingSlugsIn, WIKILINK_RE };
