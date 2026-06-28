# Decoupling content from hosting in notes-architect

**Date:** 2026-06-28
**Status:** Approved design
**Scope:** Refactor the `notes-architect` plugin so `na-build-notes` produces
host-independent markdown notes, and docsify hosting becomes a separate,
pluggable skill.

## Problem

The `na-build-notes` skill currently couples *content generation* with *docsify
hosting*. The pedagogy (PHILOSOPHY.md), content writing (notes-author), and
orchestration (SKILL.md) are cleanly separated, but hosting is entangled in:

- `_sidebar.md` — onion structure expressed as docsify-parsed markup
- `index.html` — docsify shell + an inline `notesSearch` plugin that parses the
  sidebar for breadcrumbs
- `css/globals.css` — dark theme + sidebar styling that renders the two-scale onion
- `scripts/init.sh`, `scripts/verify.js` — scaffold/validate a docsify site
- the `notes/` site-root assumption, and docsify-specific requirements baked into
  page content (first-line stylesheet `<link>`, relative `./page.md` links)

We want the same content to be hostable several different ways. The build skill
should emit well-organized markdown with **wikilinks** and **reference citations**,
independent of whatever system hosts it.

## Architecture

Two clean layers with a **manifest as the contract** between them:

```
na-build-notes  ──emits──▶  notes/ (portable markdown + structure.yaml)  ──consumed by──▶  na-host-docsify
   (content layer)                  (the host-independent contract)                    (one of N possible hosts)
```

- **`na-build-notes`** (content): decomposes the topic right→left into the onion,
  writes `structure.yaml`, delegates pages to `notes-author`. Output is pure
  portable markdown — wikilinks, footnotes, no stylesheet lines, no docsify
  assumptions. Knows nothing about how it will be viewed.
- **`na-host-docsify`** (new skill, hosting): reads `structure.yaml`, scaffolds the
  docsify shell, generates `_sidebar.md` / `_coverpage.md` / `_navbar.md` /
  `home.md` / `search.md` from the manifest, and translates wikilinks → docsify
  links at view time. Today's `init.sh`, the docsify `verify.js` checks, and the
  whole `template/site/` tree move here.

**Scope decision:** build *both* skills now so docsify still works end-to-end (no
regression), rather than shipping the generic build skill and leaving hosting as a
TODO.

## The contract

### `structure.yaml` (notes root)

Single source of truth any host reads. Carries everything the old `_sidebar.md`
encoded (domains, phases, order, captions) as data, not docsify markup.

```yaml
title: "Topic Name"
tagline: "one-line description"          # optional, for hosts that show a landing
domains:                                  # macro onion, in dependency order
  - name: "global foundation"
    caption: "the lay of the land"        # optional <small> blurb
    phases:                               # micro onion; optional for single-phase domains
      - name: "foundation"                # foundation | building blocks | cross-cutting | synthesis
        pages:
          - slug: "what-is-x"             # globally unique, kebab-case == filename sans .md
            title: "what is X"
            path: "global-foundation/what-is-x.md"
```

Slug uniqueness is validated here.

### Page content rules (updated house style)

- **Wikilinks** for cross-references: `[[slug]]`, `[[slug|display]]`, or
  `[[slug#heading|display]]`. No more `./page.md` relative links. Slugs resolve
  against `structure.yaml`.
- **Footnotes** `[^1]` for external citations, defined at page bottom. Per-page,
  portable everywhere, no central registry.
- **No first-line stylesheet `<link>`** — that was a docsify hack; theming moves to
  the host.
- Everything else in the house style stays: outcome-first, onion order,
  describe-then-name, `<em>` highlight, lowercase headers, bullets over prose.

A host translates `[[event-loop#phases|the loop]]` into whatever it needs (docsify:
`path/to/event-loop.md#phases` with link text "the loop").

## File migration map

| Current location | Goes to | Notes |
|---|---|---|
| `skills/na-build-notes/SKILL.md` | stays, **rewritten** | drops scaffold/deploy steps; adds "write `structure.yaml`", emit portable md |
| `agents/notes-author.md` | stays, **updated** | wikilinks + footnotes, drop stylesheet line |
| `references/PHILOSOPHY.md` | stays, **updated** | §4 linking rules → wikilinks; §5 + stylesheet rule → moved out; add citation guidance |
| `scripts/init.sh` | → `na-host-docsify` | it scaffolds the docsify shell |
| `scripts/verify.js` | **split** | content checks stay; docsify checks move to host |
| `template/site/*` | → `na-host-docsify` | index.html, css, nav, home, search, coverpage, .nojekyll — the whole viewer |
| `template/deploy/*` | → `na-host-docsify` | gh-pages.yml, Makefile — deployment is a host concern |
| — | **new** `skills/na-host-docsify/SKILL.md` | reads manifest, scaffolds, generates `_sidebar.md` from `structure.yaml`, translates wikilinks |
| — | **new** manifest schema doc | documents `structure.yaml` |

## Verification (splits in two)

- **Content verify** (na-build-notes): every page in `structure.yaml` exists and
  vice-versa; slugs globally unique; every wikilink target resolves to a known slug
  (and heading if `#`-qualified); footnote refs all defined; manifest is valid YAML.
- **Host verify** (na-host-docsify): stylesheet present, docsify nav files
  generated, `_sidebar` covers the manifest, host-specific link translation
  succeeded.

## Wikilink translation

Lives in the host skill. For docsify, the cleanest path is a small **runtime
docsify plugin** in `index.html` that rewrites `[[...]]` → anchors at load time, so
the source `.md` stays pure and portable even when served. The host scaffold injects
it. (Rejected alternative: a build-time rewrite pass that mutates files and fights
portability.)

## Out of scope (for now)

- Additional hosts (mkdocs, Obsidian export) — the manifest contract leaves the door
  open; we are not building them yet.
- Migrating any existing generated `notes/` sites — this changes the generator, not
  previously-produced output.
