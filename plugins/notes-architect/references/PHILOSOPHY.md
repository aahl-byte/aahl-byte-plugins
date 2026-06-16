# notes-architect — philosophy & conventions

This is the single source of truth for how a `notes-architect` site is organized,
written, and published. The `na-build-notes` skill and the `notes-author` agent
both read this file. When the architect generates a site, it seeds the site's own
`CLAUDE.md` from this document so future edits stay consistent.

The product is **UNDERSTANDING, not coverage.** Every change should leave a learner
better able to *reason* about the topic, not just better supplied with facts. A
section can be perfectly accurate and still FAIL — if a beginner finishes it with no
mental model, it failed. Accuracy is necessary, not sufficient.

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

Build a foundation of understanding, then peel back to specifics — never the
reverse. Each layer must be complete and correct **on its own terms**, so a reader
can stop at any depth and still hold a true (if coarse) mental model.

1. **Outer skin — the MENTAL MODEL.** Describe the system *as it actually works* in
   plain, jargon-free language, then name what you just described with the standard
   term. The plain description does the teaching; the jargon is only the label for it.
   Do NOT substitute an unrelated metaphor for that description — a comparison borrowed
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

The onion isn't a single ladder; it repeats fractally. A real topic has a **macro
onion across DOMAINS** and, inside each domain, a **micro onion across PHASES.**

**Macro onion — the DOMAINS (top level of the sidebar).** Decompose the topic into
domains and order them so each rests on the ones before it:

1. Start with a **GLOBAL FOUNDATION** domain — the shared core every later domain
   assumes (the trunk of the tree).
2. Then add domains that either *deepen the foundation* or open a *genuinely separate
   boundary*. Order them by **dependency**; where two domains are independent (parallel
   tracks), put the simpler one first.
3. The "stop at any depth and still hold a true model" rule applies **here too**: after
   finishing domain N, a reader should hold a coherent (if partial) model.

Name domains by **subject/boundary**, not by depth — depth is the phase axis's job.
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
phases are a skeleton, not a quota. Emit a phase header only when it holds pages;
for a **single-phase domain, skip the phase headers** and list its pages directly.

**The degenerate case is a SMALL topic = one domain.** A topic that doesn't warrant
multiple domains is simply one `GLOBAL FOUNDATION` domain with the four phases inside
it — which is exactly the default scaffold. Reach for multiple domains only when the
topic genuinely has parallel tracks or layered boundaries.

---

## 3. write for how people actually learn

- **Manage cognitive load:** one hard idea at a time.
- **Describe, then name:** explain the process directly in plain, jargon-free terms,
  then attach the standard term to what you just described. The description carries the
  understanding; the term is just its handle. Don't reach to an unrelated domain for a
  metaphor — that's the analogy that falls flat. An apt comparison can supplement the
  plain description, never replace it.
- **Build schemas, not lists:** always answer "why does this exist" and "what does
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

- Markdown. **One topic area per file**, under `<section>/` within the site root.
- **First line of every content page** is exactly:
  `<link rel="stylesheet" href="./css/globals.css">`
- `<em>...</em>` is a **COLORED HIGHLIGHT**, not italics — use it to spotlight the
  key phrase in a definition. Don't use it for ordinary emphasis.
- Lowercase, casual headers (these are *study notes*, not a manual):
  `#` = page/topic, `##` = sections, `###` = sub-topics/components, `####` = finer
  points.
- **Bullets over prose:** a one-line plain-language summary, then bullets.
- Keep code examples short and illustrative. Introduce the concept FIRST, code as
  the concrete example — **never lead with code.**

### linking rules

- **Note-to-note links stay RELATIVE:** `./other.md`, `../section/page.md`.
- **Nav files use ABSOLUTE paths:** `/section/page.md` (so they resolve from any
  page). Nav files are `_sidebar.md`, `_navbar.md`, `_coverpage.md`.
- Keep all CDN/stylesheet links resolvable under the published subpath.

---

## 5. the site (docsify — no build step)

Published via GitHub Pages, rendered client-side by docsify so the markdown stays
the source of truth. The site is **self-contained under `notes/`** (the docsify
root). Files:

- `index.html` — the docsify shell holding ONE central dark theme. Configured with
  `loadSidebar`, `loadNavbar`, `coverpage`, `relativePath: true`, `auto2top`,
  copy-code, and pagination, plus the bundled `notesSearch` plugin (see below).
  Every element is themed from here (via `css/globals.css`) so pages need no styling
  of their own.
- `css/globals.css` — the palette source of truth. Owns the dark theme, the `<em>`
  highlight color, the two-scale sidebar (domains → phases → pages), and the
  breadcrumb search results.
- `_sidebar.md` — navigation as the two-scale onion (DOMAINS → optional PHASE
  sub-headers → pages), using site-absolute paths. Top-level DOMAINS are visually
  distinct (divider + uppercase + accent color, with a light caption beneath); phases
  read as quiet uppercase eyebrows; pages sit indented under a faint guide line.
- A bundled **`notesSearch`** plugin (defined inline in `index.html`) replaces
  docsify's built-in search. It indexes every page client-side and renders results
  on `search.md` carrying the onion breadcrumb (DOMAIN · phase · chapter) plus the
  heading trail, so a hit's place in the structure is obvious.
- `_navbar.md`, `_coverpage.md`, `home.md` — the landing experience. Keep `home`
  LEAN and casual: a short note on how the notes are structured (the onion) and where
  to start — not self-promotion.
- `search.md` — a dedicated search page that gives search room to breathe.
- `.nojekyll` — **REQUIRED**, so GitHub Pages doesn't run Jekyll and hide the
  underscore-prefixed files.

The sidebar is responsive: wider on desktop, standard width on tablets, and a
full-screen drawer on phones that auto-closes on selection.

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
- **Structure:** adjust architecture, page order, or sidebar grouping where the
  through-line is weak, now that the real content exists.

This is the one pass that intentionally crosses single-file boundaries.

## 7. verification (before publishing)

Run `node scripts/verify.js [site-root]` (default `notes`). It enforces:

1. Every content page's first line is the stylesheet link.
2. Every relative cross-link resolves to a file that exists.
3. Every content page appears in `_sidebar.md` (no orphans), and every sidebar link
   points to a real file.

Fix all findings before committing.
