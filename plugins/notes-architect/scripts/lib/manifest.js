'use strict';
const fs = require('fs');

function readManifest(file) {
  const text = fs.readFileSync(file, 'utf8');
  const root = { title: '', tagline: '', domains: [] };
  let domain = null, phase = null, page = null;

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.replace(/^\s+/, '').length;
    const line = raw.trim();
    const unquote = (v) => v.replace(/^["']|["']$/g, '').trim();

    if (indent === 0) {
      const m = line.match(/^(title|tagline):\s*(.*)$/);
      if (m) { root[m[1]] = unquote(m[2]); continue; }
      if (/^domains:/.test(line)) continue;
    }
    if (line.startsWith('- ')) {
      const body = line.slice(2);
      if (indent <= 2) {                       // new domain
        domain = { name: '', caption: '', phases: [] };
        phase = null; page = null;
        root.domains.push(domain);
        applyKV(domain, body, unquote);
        continue;
      }
      if (/^slug:/.test(body)) {                // new page
        page = { slug: '', title: '', path: '' };
        if (phase) phase.pages.push(page);
        applyKV(page, body, unquote);
        continue;
      }
      if (domain && /^name:/.test(body)) {      // new phase
        phase = { name: '', pages: [] };
        page = null;
        domain.phases.push(phase);
        applyKV(phase, body, unquote);
        continue;
      }
    }
    const kv = line.match(/^([a-z]+):\s*(.*)$/);
    if (kv) {
      const [, k, v] = kv;
      if (k === 'phases' || k === 'pages') continue;
      const target = page || phase || domain;
      if (target) target[k] = unquote(v);
    }
  }
  return root;

  function applyKV(obj, body, unquote) {
    const kv = body.match(/^([a-z]+):\s*(.*)$/);
    if (kv) obj[kv[1]] = unquote(kv[2]);
  }
}

function flattenPages(manifest) {
  const out = [];
  for (const d of manifest.domains) {
    const phases = d.phases && d.phases.length ? d.phases : [{ name: '', pages: d.pages || [] }];
    for (const ph of phases) {
      for (const pg of ph.pages || []) {
        out.push({ domain: d.name, phase: ph.name, slug: pg.slug, title: pg.title, path: pg.path });
      }
    }
  }
  return out;
}

module.exports = { readManifest, flattenPages };
