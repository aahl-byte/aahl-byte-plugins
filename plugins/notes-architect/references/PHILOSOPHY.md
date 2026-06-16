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

1. **Outer skin — the MENTAL MODEL.** The shape of the thing in plain language, with
   an analogy a beginner already owns. No jargon survives this layer undefined.
2. **Middle layers — the MOVING PARTS.** The components and how they relate; what
   each is FOR, when you'd reach for it, what it replaces. Relationships over
   enumeration.
3. **Core — the SPECIFICS.** The detail that only makes sense once the outer layers
   exist.

### the default tier scheme

The architect organizes *any* topic into these four onion tiers. They become the
visually-distinct DOMAINS in the sidebar.

| Tier | Domain label | What lives here |
|------|--------------|-----------------|
| 1 | **FOUNDATION** — the mental model | orientation, the plain-language shape + a beginner-owned analogy, the vocabulary |
| 2 | **BUILDING BLOCKS** — the moving parts | the components; what each is *for*, when to reach for it, what it replaces |
| 3 | **CROSS-CUTTING** — concerns that span the blocks | tradeoffs, pitfalls, "use X instead of Y because Z", patterns |
| 4 | **SYNTHESIS** — putting it together | end-to-end worked examples, real systems, the details that only land last |

Not every topic needs all four tiers, and a tier may hold several pages. The tiers
are the skeleton, not a quota.

---

## 3. write for how people actually learn

- **Manage cognitive load:** one hard idea at a time.
- **Scaffold, then remove the scaffold:** lead with a familiar analogy, then
  graduate to the precise term. Analogies are training wheels — retire them before
  they mislead.
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
  full-text search, copy-code, and pagination. Every element is themed from here (via
  `css/globals.css`) so pages need no styling of their own.
- `css/globals.css` — the palette source of truth. Owns the dark theme, the `<em>`
  highlight color, and the responsive sidebar.
- `_sidebar.md` — navigation organized by onion tier, using site-absolute paths.
  Top-level DOMAINS are visually distinct from page links (divider + uppercase +
  accent color) with smaller tier sub-labels beneath.
- `_navbar.md`, `_coverpage.md`, `home.md` — the landing experience. Keep `home`
  LEAN and casual: a short note on how the notes are structured (the onion) and where
  to start — not self-promotion.
- `search.md` — a dedicated search page that gives search room to breathe.
- `.nojekyll` — **REQUIRED**, so GitHub Pages doesn't run Jekyll and hide the
  underscore-prefixed files.

The sidebar is responsive: wider on desktop, standard width on tablets, and a
full-screen drawer on phones that auto-closes on selection.

---

## 6. verification (before publishing)

Run `node scripts/verify.js [site-root]` (default `notes`). It enforces:

1. Every content page's first line is the stylesheet link.
2. Every relative cross-link resolves to a file that exists.
3. Every content page appears in `_sidebar.md` (no orphans), and every sidebar link
   points to a real file.

Fix all findings before committing.
