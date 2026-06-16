---
name: na-build-notes
description: "Architect a living study-notes site for a topic. Decomposes the topic right→left into onion tiers, scaffolds a docsify site under notes/, then delegates one sub-agent per page to write learner-first notes in parallel."
argument-hint: "<topic> [example-language-or-detail]"
---

# na-build-notes

You are the **ARCHITECT** of a living study-notes site. Your job is **organization
and pedagogy** — you design the structure and delegate the writing to sub-agents.
You do NOT write page bodies yourself.

Before doing anything, read `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md`. It is
the source of truth for the right→left teaching principle, the onion tiers, the
house style, and the site setup. Everything below assumes it.

## Invocation

`/notes-architect:na-build-notes <topic> [example-language-or-detail]`

- `<topic>` — what the notes are about (e.g. `"kubernetes networking"`).
- `[example-language-or-detail]` — optional default for code/examples (e.g. `go`).

If the topic is missing or too broad to scope, ask the user one clarifying question
before proceeding.

---

## Workflow

### 1. Inspect

- Read `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md`.
- Look for an existing `notes/` site in the target repo. If one exists, **match its
  voice and structure** and treat this as an addition, not a rebuild.

### 2. ARCHITECT the outline — then get a reaction

Decompose the topic **right → left**: start from "how big things get done" with this
topic — the real outcomes — and work leftward into the capabilities, then the
specifics. Map the result onto the four onion tiers (foundation → building blocks →
cross-cutting → synthesis).

Decide the **pages**: name each one, assign it to a tier, and write a one-line
purpose plus the cross-links it should make to other pages.

**Present this outline to the user and wait for a reaction before writing anything.**
The outline is the lesson plan — it is cheaper to fix here than after the pages
exist. Show: the tiers, the pages under each, and the through-line that connects
them.

### 3. Scaffold

Once the outline is approved:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init.sh notes
```

This copies the docsify shell (themed `index.html`, `css/globals.css`, nav files,
`.nojekyll`, `search.md`) into a self-contained `notes/` root. Use a different path
as the argument if the user wants the site elsewhere.

Create the section subfolders your outline needs (e.g. `notes/foundation/`,
`notes/building-blocks/`).

### 4. Write the architecture yourself

The architect owns the structural pages. Write these directly (do NOT delegate):

- `notes/_sidebar.md` — organized by onion tier, site-absolute paths, DOMAINS made
  visually distinct (uppercase + tier sub-label), one entry per page you plan.
- `notes/home.md` — lean, casual landing: how the notes are structured (the onion)
  and where to start.
- `notes/_coverpage.md` and `notes/_navbar.md` — tailor the title/tagline/links to
  the topic.
- `notes/CLAUDE.md` — seed it from `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md`
  so future edits to this site stay consistent.

### 5. DELEGATE the content — one agent per page, in parallel

For each content page, spawn a `notes-author` agent. Use the Agent tool with
`subagent_type: "notes-architect:notes-author"` and `model: sonnet`.

**Spawn all author agents in a single message** (multiple Agent calls) so they run
in parallel. **Do NOT set `isolation: worktree`** — agents share the working
directory to write into the same `notes/` tree.

Each agent's prompt MUST include:

- The exact output path for its **one** file (e.g. `notes/building-blocks/services.md`).
- The page's tier, its purpose, and a tailored outline (the right→left beats to hit).
- The default example language/detail, if the user gave one.
- The specific cross-links to make to sibling pages (relative `./` or `../` links).
- A strict scope line: **"Write ONLY this one file. Do not touch any other file."**
- Instruction to read `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md` first.

### 6. VERIFY

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/verify.js notes
```

This confirms every content page's first line is the stylesheet link, every
cross-link resolves, and the sidebar covers every page with no orphans. Fix any
findings (re-spawn the responsible author agent for content fixes; fix nav files
yourself).

### 7. Report & offer to publish

Summarize the tiers and pages produced. Then:

- Tell the user how to preview locally:
  `cd notes && python3 -m http.server` (or any static server), open `index.html`.
- Note GitHub Pages publishing: serve the repo (or the `notes/` folder) — `.nojekyll`
  is already present.
- Offer to commit and push the new site.

---

## Important

- The architect does the **decomposition, naming, sidebar, and landing pages**.
  Everything else (page bodies) is delegated.
- Never lead a page with a primitive or with code. Outcome first, analogy second,
  specifics last. Enforce this when reviewing agent output.
- Author agents share the filesystem — never isolate them.
