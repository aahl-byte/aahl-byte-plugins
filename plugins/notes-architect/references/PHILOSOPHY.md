# notes-architect — philosophy & conventions

This is the single source of truth for how a `notes-architect` note set is
organized and written. The `na-build-notes` skill and the `notes-author` agent
both read this file. When the architect generates a note set, it seeds the set's own
`CLAUDE.md` from this document so future edits stay consistent.

Notes are **host-independent**: a folder of portable markdown plus a `structure.yaml`
manifest (see §5). *How* the notes get published or viewed — docsify, Obsidian,
mkdocs, a bare markdown reader — is a separate concern owned by a **host skill**
(e.g. `na-host-docsify`), never by the notes themselves.

The product is **UNDERSTANDING.** Every change should leave a learner better able to
*reason* about the topic. A section can be perfectly accurate and still FAIL — if a
beginner finishes it with no mental model, it failed.

---

## 1. the core teaching principle — think RIGHT → LEFT

Always reason from "how big things get done" — the OUTCOME on the right — and work
LEFTWARD into the detail required to get there.

Most docs go left→right: they start at the smallest primitive and hope the reader
assembles the big picture. **Invert this.**

- Start at the right edge: the OUTCOME. What does a real system or person actually
  do or want? Name the destination before describing the road.
- Move leftward into capability. This surfaces CATEGORIES before specific things,
  and specific things before their settings and parameters.
- The smallest details come LAST, once there is somewhere for them to land.

When drafting or reviewing a section, ask: *does this open with the thing a person
is trying to accomplish, or with a primitive?* If it opens with a primitive, it is
backwards — fix it.

---

## 2. structure like an onion

Build a foundation of understanding, then peel back to specifics. Each layer must
be complete and correct **on its own terms**, so a reader
can stop at any depth and still hold a true (if coarse) mental model.

1. **Outer skin — the MENTAL MODEL.** Describe the system *as it actually works* in
   plain, jargon-free language, then name what you just described with the standard
   term. Do NOT substitute an unrelated metaphor for that description — a comparison borrowed
   from some other domain is the kind of analogy that falls flat. (A genuinely apt
   comparison may supplement the description, but it never replaces describing the real
   mechanics.) Assume the reader knows common terms and lean on the foundation pages
   for the rest.
2. **Middle layers — the MOVING PARTS.** The components and how they relate; what
   each is FOR, when you'd reach for it, what it replaces. Relationships over
   enumeration.
3. **Core — the SPECIFICS.** The detail that only makes sense once the outer layers
   exist.

### the onion is SELF-SIMILAR — apply it at two scales

The onion repeats fractally. A real topic has a **macro
onion across DOMAINS** and, inside each domain, a **micro onion across PHASES.**

**Macro onion — the DOMAINS (the top tier of the manifest).** Decompose the topic into
domains and order them so each rests on the ones before it:

1. Start with a **GLOBAL FOUNDATION** domain — the shared core every later domain
   assumes (the trunk of the tree).
2. Then add domains that either *deepen the foundation* or open a *genuinely separate
   boundary*. Order them by **dependency**; where two domains are independent (parallel
   tracks), put the simpler one first.
3. The "stop at any depth and still hold a true model" rule applies **here too**: after
   finishing domain N, a reader should hold a coherent (if partial) model.

Name domains by **subject/boundary**; depth is the phase axis's job.
When a subject grows too big, split it into more domains *by sub-topic*; don't suffix
domains with `-deep-dive`/`-esoteric` (that double-encodes the onion and blurs the
domain/phase line). A late "revisit the core, harder" domain is fine and valuable —
name it for what it covers and let its late position convey the depth.

**Micro onion — the PHASES (within each domain).** Inside a domain, organize pages
into these four phases:

| Phase | Label | What lives here |
|-------|-------|-----------------|
| 1 | **foundation** — the mental model | orientation, the plain-language shape + a beginner-owned analogy, the vocabulary |
| 2 | **building blocks** — the moving parts | the components; what each is *for*, when to reach for it, what it replaces |
| 3 | **cross-cutting** — concerns that span the blocks | tradeoffs, pitfalls, "use X instead of Y because Z", patterns |
| 4 | **synthesis** — putting it together | end-to-end worked examples, real systems, the details that only land last |

Not every domain needs all four phases, and a phase may hold several pages — the
phases are a skeleton. Emit a phase header only when it holds pages;
for a **single-phase domain, skip the phase headers** and list its pages directly.

**The degenerate case is a SMALL topic = one domain.** A topic that doesn't warrant
multiple domains is simply one `GLOBAL FOUNDATION` domain with the four phases inside
it — which is exactly the default scaffold. Reach for multiple domains only when the
topic genuinely has parallel tracks or layered boundaries.

---

## 3. write for how people actually learn

- **Manage cognitive load:** one hard idea at a time.
- **Describe, then name:** explain the process directly in plain, jargon-free terms,
  then attach the standard term to what you just described. Don't reach to an
  unrelated domain for a metaphor — that's the analogy that falls flat. An apt
  comparison can supplement the plain description, never replace it.
- **Build schemas:** always answer "why does this exist" and "what does
  it connect to" before "what are its parameters."
- **Progressive disclosure:** the first third of any page is a correct *coarse*
  model.
- **Concrete before abstract:** a worked example earns the right to state a general
  rule.
- **Contrast is where understanding lives:** prefer "X instead of Y because Z" over
  a bare list. Include a "when to use" list wherever options compete — the CHOICE is
  the lesson.
- **Spacing & connection:** cross-link related ideas across pages so they are
  re-encountered.

---

## 4. house style & conventions

- Markdown. **One topic area per file**, under `<domain>/` within the notes root.
- Pages are **plain, portable markdown** — no stylesheet links, no host-specific
  markup. The first line is the page's `#` title.
- `<em>...</em>` is a **COLORED HIGHLIGHT**, not italics — use it to spotlight the
  key phrase in a definition. Don't use it for ordinary emphasis.
- Lowercase, casual headers (these are *study notes*):
  `#` = page/topic, `##` = sections, `###` = sub-topics/components, `####` = finer
  points.
- **Bullets over prose:** a one-line plain-language summary, then bullets.
- Keep code examples short and illustrative. Introduce the concept FIRST, code as
  the concrete example — **never lead with code.**

### linking & citation rules

- **Note-to-note links are WIKILINKS:** `[[slug]]`, `[[slug|display text]]`, or
  `[[slug#heading|display text]]`. The `slug` is the target page's filename without
  `.md`; slugs are **globally unique** and resolve against `structure.yaml`. A host
  translates wikilinks into whatever it needs at view time — the notes stay portable.
- **External sources are cited with markdown footnotes:** `[^id]` inline, with the
  matching `[^id]: …` definition at the bottom of the same page. Footnotes are
  per-page and render everywhere, so the citations travel with the notes.
- No nav-file paths, CDN links, or stylesheet links live in note bodies — those are
  host concerns.

---

## 5. the manifest (`structure.yaml`)

A note set is a folder of portable `.md` files plus a single `structure.yaml` at the
root. The manifest is the **host-independent contract**: it records the two-scale
onion as data so any host can rebuild navigation without parsing prose. The notes
themselves carry no host-specific markup.

```yaml
title: "Topic Name"
tagline: "one-line description"          # optional; some hosts show it on a landing
domains:                                  # macro onion, in dependency order
  - name: "global foundation"
    caption: "the lay of the land"        # optional one-line blurb
    phases:                               # micro onion; omit for a single-phase domain
      - name: "foundation"                # foundation | building blocks | cross-cutting | synthesis
        pages:
          - slug: "what-is-x"             # globally unique; == filename without .md
            title: "what is X"
            path: "global-foundation/what-is-x.md"   # relative to the notes root
```

- **Domains** are listed in onion order; each carries an optional `caption`.
- **Phases** are optional — a single-phase domain lists its `pages:` directly under
  the domain, skipping phase headers (mirrors §2's degenerate case).
- **Pages** record `slug`, `title`, and `path`. The `slug` is the wikilink target and
  must be unique across the whole set.

The architect writes and owns `structure.yaml`; authors never touch it. A **host
skill** reads it to generate that host's navigation (e.g. a docsify `_sidebar.md`).

---

## 6. the cleanup pass — read the site as one document

Pages are drafted one at a time (often by separate agents that never saw each other's
work). Before publishing, someone with the **whole-site view** reads them together and
edits across files. This pass is where a pile of correct pages becomes one coherent set
of notes:

- **Consistency** of terminology, voice, heading style, and depth across pages — the
  site should read as one author.
- **Connection:** cross-link ideas where they're re-encountered, and point each page
  back to its prerequisite chapter(s) so the reading order is discoverable.
- **A second editorial eye** on each chapter: tighten prose, fix gaps, cut padding,
  and confirm every page still opens outcome-first and stays plainly described.
- **Structure:** adjust architecture, page order, or domain/phase grouping where the
  through-line is weak, now that the real content exists.

This is the one pass that intentionally crosses single-file boundaries.

## 7. verification (before handing off to a host)

Run `node scripts/verify-content.js [notes-root]` (default `notes`). It enforces the
host-independent content contract:

1. `structure.yaml` exists and is valid.
2. Slugs are globally unique.
3. Every manifest page has a file on disk, and every `.md` on disk is in the manifest
   (no orphans).
4. Every wikilink resolves to a known slug — and, if `#heading`-qualified, to a real
   heading on the target page.
5. Every footnote reference `[^id]` has a matching definition on its page.
6. No page carries host-specific markup (e.g. a stylesheet link).

Fix all findings before committing. Host-specific verification (themed shell present,
nav generated, etc.) lives with each host skill, not here.
