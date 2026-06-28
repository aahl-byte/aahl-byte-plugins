# Decouple Content from Hosting in notes-architect — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans (or subagent-driven-development) to implement this plan task-by-task.

**Goal:** Split the `notes-architect` plugin so `na-build-notes` emits host-independent markdown (wikilinks + footnotes + a `structure.yaml` manifest), and move all docsify hosting into a new `na-host-docsify` skill that consumes the manifest.

**Architecture:** Two layers with a manifest contract. `na-build-notes` (content) writes `structure.yaml` + portable `.md` pages and validates them with a new `verify-content.js`. `na-host-docsify` (hosting) reads the manifest, scaffolds the docsify shell, generates nav/landing files + a slug→path map, and rewrites `[[wikilinks]]` at view time via a runtime docsify plugin.

**Tech Stack:** Markdown skill/agent definitions, dependency-free Node.js scripts (`node:test` + `node:assert` for tests, no npm deps), bash scaffold script, docsify (CDN, no build) for the host.

**Design doc:** `docs/plans/2026-06-28-notes-architect-hosting-decouple-design.md`

**Conventions for this plan:**
- All paths are relative to repo root `/mnt/oak/git/aahl-byte-plugins`.
- Plugin root shorthand: `P = plugins/notes-architect`.
- Use `git mv` for moves (preserve history). Commit after every task.
- Tests run with `node --test <dir>`; they use throwaway fixtures created under
  the system temp dir by the test itself, not committed, EXCEPT the shared
  end-to-end fixture in Task 1.

---

## Task 1: Test harness + shared fixture

**Files:**
- Create: `P/scripts/test/fixtures/sample-notes/structure.yaml`
- Create: `P/scripts/test/fixtures/sample-notes/global-foundation/what-is-x.md`
- Create: `P/scripts/test/fixtures/sample-notes/global-foundation/the-event-loop.md`
- Create: `P/scripts/test/README.md`

**Step 1: Create the fixture manifest**

`P/scripts/test/fixtures/sample-notes/structure.yaml`:

```yaml
title: "X internals"
tagline: "how X actually runs your code"
domains:
  - name: "global foundation"
    caption: "the lay of the land"
    phases:
      - name: "foundation"
        pages:
          - slug: "what-is-x"
            title: "what is X"
            path: "global-foundation/what-is-x.md"
      - name: "building blocks"
        pages:
          - slug: "the-event-loop"
            title: "the event loop"
            path: "global-foundation/the-event-loop.md"
```

**Step 2: Create two portable pages that exercise wikilinks + footnotes**

`P/scripts/test/fixtures/sample-notes/global-foundation/what-is-x.md`:

```markdown
# what is x

x is a runtime. the one idea to hold first is that it runs your code on a single
<em>main thread</em> and never blocks it.[^1]

once that clicks, read [[the-event-loop|how it stays unblocked]].

[^1]: X docs, "execution model" — https://example.com/x/exec
```

`P/scripts/test/fixtures/sample-notes/global-foundation/the-event-loop.md`:

```markdown
# the event loop

the loop is the part that decides what runs next. it picks the next ready
callback and runs it to completion.

this is the mechanism named in [[what-is-x#what-is-x|the intro]]; the deep dive
on phases lives at [[the-event-loop#phases]].

## phases

each turn has ordered phases.[^1]

[^1]: X docs, "the loop" — https://example.com/x/loop
```

**Step 3: Document the fixture**

`P/scripts/test/README.md` — short note: this fixture is the canonical
host-independent note tree; used by `verify-content` tests and the host
build/verify tests; deliberately includes a multi-phase domain, a heading-qualified
wikilink, an aliased wikilink, and per-page footnotes.

**Step 4: Sanity-check it parses as YAML**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('plugins/notes-architect/scripts/test/fixtures/sample-notes/structure.yaml','utf8');console.log(s.length>0?'ok':'empty')"`
Expected: `ok` (we hand-parse YAML in scripts; this is just a read check).

**Step 5: Commit**

```bash
git add plugins/notes-architect/scripts/test
git commit -m "test(notes-architect): add shared host-independent note fixture"
```

---

## Task 2: Minimal YAML reader for the manifest

We avoid an npm dependency. The manifest uses a fixed, shallow shape, so a tiny
purpose-built parser is enough (and is the one place both content-verify and the
host build need to read `structure.yaml`).

**Files:**
- Create: `P/scripts/lib/manifest.js`
- Test: `P/scripts/test/manifest.test.js`

**Step 1: Write the failing test**

`P/scripts/test/manifest.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
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
```

**Step 2: Run it, verify it fails**

Run: `node --test plugins/notes-architect/scripts/test/manifest.test.js`
Expected: FAIL — `Cannot find module '../lib/manifest.js'`.

**Step 3: Implement `P/scripts/lib/manifest.js`**

```javascript
'use strict';
const fs = require('fs');

/*
 * Tiny reader for structure.yaml. Supports ONLY the manifest's fixed shape:
 * scalars (title, tagline), and the domains→phases→pages list nesting with
 * keys name/caption/slug/title/path. Not a general YAML parser.
 */
function readManifest(file) {
  const text = fs.readFileSync(file, 'utf8');
  const root = { title: '', tagline: '', domains: [] };
  let domain = null, phase = null, page = null, inPages = false;

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
    // "- name:" at indent 2 => a domain; at deeper indent under a phase's
    // pages => a page item.
    if (line.startsWith('- ')) {
      const body = line.slice(2);
      if (indent <= 2) {                       // new domain
        domain = { name: '', caption: '', phases: [] };
        phase = null; page = null; inPages = false;
        root.domains.push(domain);
        applyKV(domain, body, unquote);
        continue;
      }
      if (phase && inPages) {                   // new page
        page = { slug: '', title: '', path: '' };
        phase.pages.push(page);
        applyKV(page, body, unquote);
        continue;
      }
      if (domain && /^name:/.test(body)) {      // new phase (under phases:)
        phase = { name: '', pages: [] };
        page = null; inPages = false;
        domain.phases.push(phase);
        applyKV(phase, body, unquote);
        continue;
      }
    }
    // continuation key: value lines for the current open object
    const kv = line.match(/^([a-z]+):\s*(.*)$/);
    if (kv) {
      const [, k, v] = kv;
      if (k === 'phases') { inPages = false; continue; }
      if (k === 'pages') { inPages = true; continue; }
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
```

**Step 4: Run the test, verify it passes**

Run: `node --test plugins/notes-architect/scripts/test/manifest.test.js`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add plugins/notes-architect/scripts/lib/manifest.js plugins/notes-architect/scripts/test/manifest.test.js
git commit -m "feat(notes-architect): add manifest reader for structure.yaml"
```

> **Note for implementer:** if this hand-parser proves fragile against real
> manifests during the end-to-end task, STOP and reconsider — a vendored
> single-file YAML parser may be warranted. The fixed shape above is the contract;
> keep manifests to it.

---

## Task 3: `verify-content.js` — slug uniqueness + manifest/page coverage

**Files:**
- Create: `P/scripts/verify-content.js`
- Test: `P/scripts/test/verify-content.test.js`

**Step 1: Write the failing test (coverage + uniqueness)**

`P/scripts/test/verify-content.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { verifyContent } = require('../verify-content.js');

const FIX = path.join(__dirname, 'fixtures', 'sample-notes');

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
```

**Step 2: Run it, verify it fails**

Run: `node --test plugins/notes-architect/scripts/test/verify-content.test.js`
Expected: FAIL — module not found.

**Step 3: Implement `P/scripts/verify-content.js`**

Export a pure `verifyContent(root, opts)` returning `{ errors, warnings, pageCount }`,
plus a CLI wrapper at the bottom. Checks:

1. `structure.yaml` exists and parses (via `lib/manifest.js`).
2. Slugs are globally unique.
3. Every manifest page's `path` file exists (use `opts.overridePages` when given,
   else `flattenPages`).
4. Every `.md` file on disk (excluding `structure.yaml` and dotfiles) appears in the
   manifest (no orphan pages).
5. No page contains a docsify stylesheet line (`<link rel="stylesheet" ...globals.css>`)
   — content must stay host-independent.

```javascript
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

  // 2. unique slugs
  const seen = new Map();
  for (const p of pages) {
    if (seen.has(p.slug)) errors.push(`[slug] duplicate slug "${p.slug}" (${p.path} and ${seen.get(p.slug)})`);
    else seen.set(p.slug, p.path);
  }

  // 3. manifest pages exist + 5. no stylesheet line
  const onDisk = walkMd(root);
  const manifestPaths = new Set(pages.map(p => path.resolve(root, p.path)));
  for (const p of pages) {
    const abs = path.resolve(root, p.path);
    if (!fs.existsSync(abs)) { errors.push(`[page] ${p.path} in manifest but file missing`); continue; }
    const first = fs.readFileSync(abs, 'utf8').split(/\r?\n/, 1)[0];
    if (/globals\.css/.test(first)) errors.push(`[host-leak] ${p.path} starts with a docsify stylesheet line; content must be host-independent`);
  }

  // 4. orphans
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
```

**Step 4: Run the test, verify it passes**

Run: `node --test plugins/notes-architect/scripts/test/verify-content.test.js`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add plugins/notes-architect/scripts/verify-content.js plugins/notes-architect/scripts/test/verify-content.test.js
git commit -m "feat(notes-architect): content-verify for manifest coverage + slug uniqueness"
```

---

## Task 4: Wikilink + footnote validation in `verify-content.js`

**Files:**
- Create: `P/scripts/lib/wikilinks.js` (pure parse/rewrite, shared with the host)
- Modify: `P/scripts/verify-content.js` (add link + footnote checks)
- Test: `P/scripts/test/wikilinks.test.js`
- Modify: `P/scripts/test/verify-content.test.js`

**Step 1: Write failing tests for the wikilink parser**

`P/scripts/test/wikilinks.test.js`:

```javascript
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
```

**Step 2: Run, verify fail**

Run: `node --test plugins/notes-architect/scripts/test/wikilinks.test.js`
Expected: FAIL — module not found.

**Step 3: Implement `P/scripts/lib/wikilinks.js`**

```javascript
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

// docsify-compatible heading slug (mirrors index.html slugify)
function slugifyHeading(text) {
  return text.toLowerCase().trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
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
```

**Step 4: Run, verify pass**

Run: `node --test plugins/notes-architect/scripts/test/wikilinks.test.js`
Expected: PASS (2 tests).

**Step 5: Add link + footnote checks to `verify-content.js`**

Add to `verifyContent`, after building `pages` and a `bySlug` map:

```javascript
const { parseWikilinks, headingSlugsIn } = require('./lib/wikilinks.js');
// ...
const bySlug = new Map(pages.map(p => [p.slug, p]));
const headingCache = new Map(); // slug -> Set of heading slugs

for (const p of pages) {
  const abs = path.resolve(root, p.path);
  if (!fs.existsSync(abs)) continue;
  const md = fs.readFileSync(abs, 'utf8');

  // wikilink targets resolve to a known slug (+ heading if qualified)
  for (const link of parseWikilinks(md)) {
    const target = bySlug.get(link.slug);
    if (!target) { errors.push(`[wikilink] ${p.path} → [[${link.slug}]] — no page with that slug`); continue; }
    if (link.heading) {
      if (!headingCache.has(link.slug)) {
        const tAbs = path.resolve(root, target.path);
        headingCache.set(link.slug, fs.existsSync(tAbs) ? headingSlugsIn(fs.readFileSync(tAbs, 'utf8')) : new Set());
      }
      const { slugifyHeading } = require('./lib/wikilinks.js');
      if (!headingCache.get(link.slug).has(slugifyHeading(link.heading)))
        errors.push(`[wikilink] ${p.path} → [[${link.slug}#${link.heading}]] — heading not found on target`);
    }
  }

  // every [^id] reference has a [^id]: definition on the page
  const refs = [...md.matchAll(/\[\^([^\]]+)\](?!:)/g)].map(m => m[1]);
  const defs = new Set([...md.matchAll(/^\[\^([^\]]+)\]:/gm)].map(m => m[1]));
  for (const r of refs) if (!defs.has(r)) errors.push(`[footnote] ${p.path} → [^${r}] used but never defined`);
}
```

**Step 6: Extend `verify-content.test.js`**

Add tests: (a) a fixture-copy with a dangling `[[no-such-slug]]` reports a `[wikilink]`
error; (b) a copy with `[[the-event-loop#nope]]` reports a heading error; (c) a copy
with `[^9]` used but undefined reports a `[footnote]` error. Build these by copying the
fixture into `os.tmpdir()` and mutating one page (use `fs.cpSync(FIX, tmp, {recursive:true})`).

**Step 7: Run all script tests, verify pass**

Run: `node --test plugins/notes-architect/scripts/test/`
Expected: PASS (all suites).

**Step 8: Commit**

```bash
git add plugins/notes-architect/scripts
git commit -m "feat(notes-architect): validate wikilinks + footnotes in content-verify"
```

---

## Task 5: Update PHILOSOPHY.md for the content/host split

**Files:**
- Modify: `P/references/PHILOSOPHY.md`

**Step 1: Edit the intro (lines ~1-6)**

Change "how a notes-architect site is organized, written, and published" → "how a
notes-architect note SET is organized and written" and note that *hosting* (how it's
published/viewed) is a separate concern owned by host skills (e.g. `na-host-docsify`).

**Step 2: Rewrite §4 "house style" linking rules (lines ~120-139)**

- Drop the "First line of every content page is the stylesheet link" bullet entirely.
- Replace the "linking rules" subsection with the wikilink + footnote contract:
  - Cross-references use wikilinks: `[[slug]]`, `[[slug|display]]`, `[[slug#heading|display]]`.
    Slugs are globally unique and equal the page filename without `.md`; they resolve
    against `structure.yaml`.
  - External citations use markdown footnotes `[^id]` defined at the page bottom.
  - Remove the "nav files use absolute paths" / "CDN/stylesheet links" guidance (host concern).

**Step 3: Replace §5 "the site (docsify…)" (lines ~143-173)**

Replace with a new §5 "the manifest (structure.yaml)" describing the contract: the
note set is a folder of portable `.md` files plus a `structure.yaml` at the root that
records title/tagline and the two-scale onion (domains → optional phases → pages, in
order) with each page's slug/title/path. State that hosting skills read this manifest
to build navigation; the notes themselves carry no host-specific markup.

**Step 4: Update §7 "verification" (lines ~195-204)**

Point to `node scripts/verify-content.js [root]` and list the new checks (manifest
valid, slugs unique, pages↔manifest coverage, wikilinks resolve, footnotes defined,
no host-specific lines). Note that host-specific verification lives with each host skill.

**Step 5: Review the whole file reads coherently**

Run: `node --test plugins/notes-architect/scripts/` (no-op for prose, but confirms nothing broke)
Manually re-read PHILOSOPHY.md top to bottom; ensure no remaining docsify/stylesheet references outside a host context.

**Step 6: Commit**

```bash
git add plugins/notes-architect/references/PHILOSOPHY.md
git commit -m "docs(notes-architect): philosophy describes host-independent notes + manifest"
```

---

## Task 6: Update the notes-author agent

**Files:**
- Modify: `P/agents/notes-author.md`

**Step 1: Remove the stylesheet non-negotiable**

Delete non-negotiable #1 (lines ~29-30, the `<link rel="stylesheet">` first line) and
renumber the rest.

**Step 2: Replace the cross-link rules with wikilinks**

- In "Your scope": the architect supplies cross-links as **slugs**, not paths.
- In "Style": replace "Cross-links stay relative: ./sibling.md…" with: cross-links are
  wikilinks — `[[slug]]`, `[[slug|display]]`, `[[slug#heading|display]]` — woven into
  prose where an idea is re-encountered. Use exactly the slugs the architect specified.
- Add a bullet: external sources are cited with footnotes `[^id]`, defined at the page
  bottom.

**Step 3: Update "Before you finish" checklist**

Remove "First line is the stylesheet link." Add "Every requested cross-link is present
as a `[[slug]]` wikilink" and "Every claim that needs a source has a footnote."

**Step 4: Update the "do not touch" list**

The author must not touch `structure.yaml` or sibling pages (replaces "_sidebar.md,
index.html"). The architect owns the manifest.

**Step 5: Commit**

```bash
git add plugins/notes-architect/agents/notes-author.md
git commit -m "docs(notes-architect): notes-author emits wikilinks + footnotes, no stylesheet line"
```

---

## Task 7: Rewrite na-build-notes/SKILL.md (content-only orchestration)

**Files:**
- Modify: `P/skills/na-build-notes/SKILL.md`

**Step 1: Update frontmatter description**

Reword to "Architect a host-independent set of living study notes for a topic.
Decomposes right→left into onion tiers, writes a structure.yaml manifest, then delegates
one sub-agent per page to write portable markdown (wikilinks + footnotes)." Remove
"scaffolds a docsify site".

**Step 2: Replace §3 "Scaffold"**

Remove the `init.sh` call. Replace with "Create the note folder + manifest": make the
notes root (default `notes/`) and the domain subfolders the outline needs; the host is
chosen later and is not this skill's concern.

**Step 3: Rewrite §4 "Write the architecture yourself"**

The architect now writes `notes/structure.yaml` (the manifest — see PHILOSOPHY §5)
instead of `_sidebar.md`/`home.md`/`_coverpage.md`/`_navbar.md`. Keep writing
`notes/CLAUDE.md` seeded from PHILOSOPHY.md. Drop the landing/nav-file bullets (those
are generated by a host skill).

**Step 4: Update §5 "DELEGATE"**

- Cross-links passed to authors are **slugs**, not relative paths.
- Drop the `model: sonnet` only if still desired — keep as is (authors stay sonnet).
- Keep "share the working directory; never isolate."

**Step 5: Update §6 "VERIFY"**

Replace the `verify.js` call with `node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-content.js notes`
and describe the new checks (manifest coverage, unique slugs, wikilinks resolve,
footnotes defined, no host-specific lines).

**Step 6: Update §7 "CLEANUP" link guidance**

"Note-to-note links stay relative" → "note-to-note links stay wikilinks (`[[slug]]`)".
Re-run `verify-content.js` after edits.

**Step 7: Replace §8 "Report, then ASK how they want to deploy"**

Remove all docsify/GitHub-Pages/Makefile deployment text. Replace with: summarize the
domains/phases/pages produced, then tell the user the notes are host-independent and
that they can render them with a host skill — e.g. run `/notes-architect:na-host-docsify`
to produce a docsify site, or point any markdown viewer / Obsidian vault at the folder.
Offer to commit.

**Step 8: Update "Important" footer**

Replace "decomposition, naming, sidebar, and landing pages" with "decomposition,
naming, and the manifest". Remove docsify references.

**Step 9: Verify nothing references removed scripts**

Run: `grep -rn "init.sh\|verify.js\|_sidebar\|docsify\|globals.css" plugins/notes-architect/skills/na-build-notes/SKILL.md plugins/notes-architect/agents plugins/notes-architect/references`
Expected: no matches in these content-layer files (any remaining matches in references are bugs to fix).

**Step 10: Commit**

```bash
git add plugins/notes-architect/skills/na-build-notes/SKILL.md
git commit -m "feat(notes-architect): na-build-notes emits manifest + portable notes, no hosting"
```

---

## Task 8: Move docsify assets into the host skill

**Files:**
- Move: `P/template/site/` → `P/host/docsify/template/`
- Move: `P/template/deploy/` → `P/host/docsify/deploy/`
- Move: `P/scripts/init.sh` → `P/host/docsify/init.sh`
- Keep `P/scripts/verify.js` for now (Task 10 replaces it; delete there).

**Step 1: git mv the template + deploy + init**

```bash
cd plugins/notes-architect
mkdir -p host/docsify
git mv template/site host/docsify/template
git mv template/deploy host/docsify/deploy
git mv scripts/init.sh host/docsify/init.sh
rmdir template 2>/dev/null || true
```

**Step 2: Fix init.sh internals**

Edit `host/docsify/init.sh`: `TEMPLATE_DIR="$PLUGIN_ROOT/host/docsify/template"`.
Update the "Next (architect)" echo block to the host flow (it now runs AFTER notes
exist: "build nav from structure.yaml, then verify"). It no longer copies `_sidebar.md`
etc. as static files — those are generated in Task 9, so remove them from the template
in Step 3.

**Step 3: Strip generated files out of the template**

These become generated by the host build, so remove the static copies:

```bash
cd plugins/notes-architect/host/docsify/template
git rm _sidebar.md _coverpage.md _navbar.md home.md
```

Keep in the template: `index.html`, `css/globals.css`, `.nojekyll`, `search.md`
(search.md is static — just the `#notes-search` container + intro).

**Step 4: Confirm the template still has what the host needs**

Run: `ls -A plugins/notes-architect/host/docsify/template`
Expected: `.nojekyll  css  index.html  search.md`

**Step 5: Commit**

```bash
git add -A plugins/notes-architect
git commit -m "refactor(notes-architect): move docsify template/deploy/init into host/docsify"
```

---

## Task 9: Host build — generate nav + landing + slug→path map from the manifest

**Files:**
- Create: `P/host/docsify/build.js`
- Test: `P/scripts/test/host-build.test.js`

`build.js` reads `structure.yaml` and writes, into the site root:
`_sidebar.md` (two-scale onion, site-absolute paths — the exact shape the existing
`notesSearch` parser in index.html expects), `_coverpage.md` + `_navbar.md` +
`home.md` (filled from title/tagline), and `_notes-map.json` (`{ slug: "/path.md" }`
for the wikilink runtime plugin).

**Step 1: Write the failing test**

`P/scripts/test/host-build.test.js`:

```javascript
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
```

**Step 2: Run, verify fail**

Run: `node --test plugins/notes-architect/scripts/test/host-build.test.js`
Expected: FAIL — module not found.

**Step 3: Implement `P/host/docsify/build.js`**

`buildNav(root)`: read `structure.yaml` via `../../scripts/lib/manifest.js`
(`readManifest`, `flattenPages`). Generate:

- `_sidebar.md`: for each domain → `- **<name>**` + optional `<small><caption></small>`;
  if the domain has named phases, nest `  - **<phase>**` then page links at the next
  indent; single-phase/no-phase domains list page links directly under the domain.
  Page links are `[<title>](/<path>)` (site-absolute, leading `/`). This MUST match the
  indent contract the `notesSearch` parser uses (indent 0 bold = domain, indent 2 bold =
  phase, links = pages).
- `_notes-map.json`: `Object.fromEntries(flattenPages(m).map(p => [p.slug, '/' + p.path]))`.
- `_coverpage.md`, `_navbar.md`, `home.md`: small templates with `${title}` / `${tagline}`
  substituted. (Lift the prose from the pre-move template files preserved in git history
  — `git show HEAD~1:plugins/notes-architect/host/docsify/template/home.md` etc. — and
  parameterize the title/tagline.)

Provide a CLI wrapper (`if (require.main === module) buildNav(process.argv[2] || 'notes')`).

**Step 4: Run, verify pass**

Run: `node --test plugins/notes-architect/scripts/test/host-build.test.js`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add plugins/notes-architect/host/docsify/build.js plugins/notes-architect/scripts/test/host-build.test.js
git commit -m "feat(notes-architect): host build generates docsify nav + slug map from manifest"
```

---

## Task 10: Host verify — adapt the old verify.js to the docsify output

**Files:**
- Create: `P/host/docsify/verify-host.js`
- Delete: `P/scripts/verify.js`
- Test: `P/scripts/test/host-verify.test.js`

`verify-host.js` validates a BUILT docsify site (run after `build.js`): `index.html`
exists and links `./css/globals.css`; `_sidebar.md`, `_notes-map.json`, `.nojekyll`
present; `_sidebar.md` covers every manifest page; every slug in `_notes-map.json`
matches a manifest slug.

**Step 1: Write the failing test**

`P/scripts/test/host-verify.test.js`: copy fixture to tmp, run `buildNav`, then copy
the template's `index.html` + `css` + `.nojekyll` + `search.md` in (mimic init.sh),
assert `verifyHost(root).errors` is empty; then delete `_notes-map.json` and assert an
error is reported.

**Step 2: Run, verify fail**

Run: `node --test plugins/notes-architect/scripts/test/host-verify.test.js`
Expected: FAIL — module not found.

**Step 3: Implement `P/host/docsify/verify-host.js`**

Reuse the link-resolution logic from the old `verify.js` (relative + site-absolute
`.md` link existence) but drop the per-page stylesheet-line check (now `index.html`'s
job) and read coverage from `structure.yaml` via the manifest lib instead of scraping
`_sidebar.md`. Export `verifyHost(root)`; add CLI wrapper.

**Step 4: Delete the old verify.js**

```bash
git rm plugins/notes-architect/scripts/verify.js
```

**Step 5: Run, verify pass**

Run: `node --test plugins/notes-architect/scripts/test/host-verify.test.js`
Expected: PASS.

**Step 6: Commit**

```bash
git add -A plugins/notes-architect
git commit -m "feat(notes-architect): host-verify for built docsify site; drop old verify.js"
```

---

## Task 11: Wikilink runtime plugin in index.html

**Files:**
- Modify: `P/host/docsify/template/index.html`

The notes ship with `[[slug#heading|alias]]`; docsify must render them as links at
view time using `_notes-map.json`.

**Step 1: Add a `wikilinks` docsify plugin**

In the `plugins: [...]` array of `window.$docsify`, add a plugin that:
- on `hook.beforeEach`, ensures `_notes-map.json` is fetched once (cache the promise);
  store the `{slug: "/path.md"}` map.
- on `hook.beforeEach(content)`, replace each `[[slug(#heading)?(|alias)?]]` with a
  markdown link `[alias-or-slug](#/<path-without-ext>?id=<slugified-heading>)`. Reuse
  the SAME heading slugify already defined for `notesSearch` (factor it to a shared
  local function so the two agree). Unknown slugs render as plain text with a
  `<!-- unresolved wikilink -->` marker (do not crash).

Because `beforeEach` may run before the async map resolves on the very first page,
fetch the map synchronously-enough: kick off the fetch in the plugin's top scope and,
if the map isn't ready, leave `[[...]]` untouched and re-render on `doneEach` once it
arrives (or simpler: fetch the map in `hook.init` and gate `beforeEach` behind it).
Keep it robust; a missing map must never blank the page.

**Step 2: Manual render check (deferred to Task 12 end-to-end)**

No unit test here (browser code); the end-to-end task verifies rendered output.
Confirm the file is still valid HTML:

Run: `node -e "require('fs').readFileSync('plugins/notes-architect/host/docsify/template/index.html','utf8').includes('wikilinks')?console.log('ok'):process.exit(1)"`
Expected: `ok`

**Step 3: Commit**

```bash
git add plugins/notes-architect/host/docsify/template/index.html
git commit -m "feat(notes-architect): docsify renders [[wikilinks]] via runtime plugin + slug map"
```

---

## Task 12: na-host-docsify SKILL.md + end-to-end smoke test

**Files:**
- Create: `P/skills/na-host-docsify/SKILL.md`
- Create: `P/host/docsify/Makefile` is already moved; ensure paths inside it are correct.

**Step 1: Write the host skill**

`P/skills/na-host-docsify/SKILL.md` frontmatter: `name: na-host-docsify`,
`description: "Render an existing host-independent notes/ folder (structure.yaml +
portable markdown) as a docsify site: scaffold the shell, generate navigation from the
manifest, and wire wikilink rendering."`, `argument-hint: "[notes-root]"`.

Workflow:
1. Require a notes root with `structure.yaml` (default `notes/`). If missing, tell the
   user to run `na-build-notes` first.
2. Run content-verify first: `node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-content.js <root>`.
3. Scaffold the shell: `bash ${CLAUDE_PLUGIN_ROOT}/host/docsify/init.sh <root>`
   (copies index.html, css, .nojekyll, search.md).
4. Generate nav + map: `node ${CLAUDE_PLUGIN_ROOT}/host/docsify/build.js <root>`.
5. Verify the built site: `node ${CLAUDE_PLUGIN_ROOT}/host/docsify/verify-host.js <root>`.
6. Preview: `cd <root> && python3 -m http.server 8080` → open `http://leaf-rain:8080`.
7. Offer deploy options (GitHub Pages via `host/docsify/deploy/github-pages.yml`, other
   static hosts, or local-only) and the convenience Makefile — the deployment prose that
   was removed from na-build-notes §8 moves here.

**Step 2: End-to-end smoke test against the fixture**

Run, from repo root:

```bash
ROOT=$(mktemp -d)/notes && mkdir -p "$ROOT"
cp -r plugins/notes-architect/scripts/test/fixtures/sample-notes/. "$ROOT"/
CLAUDE_PLUGIN_ROOT=plugins/notes-architect node plugins/notes-architect/scripts/verify-content.js "$ROOT"
CLAUDE_PLUGIN_ROOT=plugins/notes-architect bash plugins/notes-architect/host/docsify/init.sh "$ROOT"
CLAUDE_PLUGIN_ROOT=plugins/notes-architect node plugins/notes-architect/host/docsify/build.js "$ROOT"
CLAUDE_PLUGIN_ROOT=plugins/notes-architect node plugins/notes-architect/host/docsify/verify-host.js "$ROOT"
ls -A "$ROOT"
```

Expected: content-verify passes; init reports ready; build writes `_sidebar.md`,
`_notes-map.json`, `_coverpage.md`, `_navbar.md`, `home.md`; verify-host passes; `ls`
shows the full docsify site. (Optional manual: serve it and confirm the `[[wikilinks]]`
in the two pages render as clickable links and the footnotes show.)

**Step 3: Run the whole test suite**

Run: `node --test plugins/notes-architect/scripts/test/`
Expected: PASS (all suites).

**Step 4: Commit**

```bash
git add plugins/notes-architect/skills/na-host-docsify plugins/notes-architect/host/docsify/Makefile
git commit -m "feat(notes-architect): add na-host-docsify skill + end-to-end host flow"
```

---

## Task 13: Plugin metadata + final sweep

**Files:**
- Modify: `P/.claude-plugin/plugin.json`
- Modify: any plugin README / marketplace listing referencing the old flow (search first).

**Step 1: Bump version + reword description**

`plugin.json`: bump `version` to `2.0.0` (breaking output-contract change). Reword
`description` to cover the two layers: "Architect host-independent living study notes
(right→left onion, wikilinks, footnotes, structure.yaml), then render them with a
pluggable host (docsify included)."

**Step 2: Grep for stale references**

Run: `grep -rni "init.sh\|verify.js\|globals.css\|_sidebar\|docsify" plugins/notes-architect --include=*.md --include=*.json | grep -v host/docsify | grep -v na-host-docsify`
Expected: no matches outside the host skill / host dir (any hit is a stale content-layer
reference to fix).

**Step 3: Run full suite once more**

Run: `node --test plugins/notes-architect/scripts/test/`
Expected: PASS.

**Step 4: Commit**

```bash
git add -A plugins/notes-architect
git commit -m "chore(notes-architect): bump to 2.0.0 — content/host split"
```

---

## Done criteria

- `na-build-notes` produces `notes/structure.yaml` + portable `.md` (wikilinks +
  footnotes, no stylesheet lines) and is validated by `verify-content.js`.
- `na-host-docsify` turns that folder into a working docsify site (nav generated from
  the manifest, wikilinks rendered at view time) and is validated by `verify-host.js`.
- The end-to-end smoke test (Task 12) passes start to finish.
- No content-layer file references docsify, `_sidebar.md`, `globals.css`, `init.sh`, or
  `verify.js`.
- `node --test plugins/notes-architect/scripts/test/` is green.
```
