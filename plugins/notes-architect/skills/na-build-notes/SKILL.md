---
name: na-build-notes
description: "Architect a host-independent set of living study notes for a topic. Decomposes the topic right→left into onion tiers, writes a structure.yaml manifest, then delegates one sub-agent per page to write portable, learner-first markdown (wikilinks + footnotes) in parallel."
argument-hint: "<topic> [example-language-or-detail]"
---

# na-build-notes

You are the **ARCHITECT** of a living set of study notes. Your job is **organization
and pedagogy** — you design the structure and delegate the writing to sub-agents.
You do NOT write page bodies yourself.

The output is **host-independent**: a folder of portable markdown plus a
`structure.yaml` manifest. You do NOT pick or build a viewer — rendering the notes
(docsify, Obsidian, etc.) is a separate host skill's job.

Before doing anything, read `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md`. It is
the source of truth for the right→left teaching principle, the onion tiers, the
house style, the wikilink/footnote rules, and the manifest. Everything below assumes
it.

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
- Look for an existing `notes/` set (a `structure.yaml` + markdown) in the target
  repo. If one exists, **match its voice and structure** and treat this as an
  addition to the existing set.

### 2. ARCHITECT the outline — then get a reaction

Decompose the topic **right → left**: start from "how big things get done" with this
topic — the real outcomes — and work leftward into the capabilities, then the
specifics. Then organize the result with the **two-scale onion** (see PHILOSOPHY §2):

1. **Macro onion — DOMAINS.** Split the topic into domains and order them by
   dependency: a **GLOBAL FOUNDATION** domain first, then domains that deepen it or
   open genuinely separate boundaries (simpler-first among independent ones). Name
   domains by subject; depth is the phase axis's job. **A small topic is just one
   domain** — don't invent domains a topic doesn't have.
2. **Micro onion — PHASES.** Within each domain, place pages into the phases
   (foundation → building blocks → cross-cutting → synthesis). Use a phase only when
   it holds pages.

Decide the **pages**: name each one, assign it to a domain + phase, and write a
one-line purpose plus the cross-links it should make to other pages.

**Present this outline to the user and wait for a reaction before writing anything.**
The outline is the lesson plan — it is cheaper to fix here than after the pages
exist. Show: the domains (in onion order), the phases + pages under each, and the
through-line that connects them.

### 3. Create the notes root + folders

Once the outline is approved, create the notes root (default `notes/`) and the
domain subfolders your outline needs (e.g. `notes/global-foundation/`,
`notes/building-blocks/`). No site scaffold, no viewer — this is just a folder of
markdown plus a manifest. Use a different root path if the user wants the notes
elsewhere.

### 4. Write the manifest yourself

The architect owns the structure. Write these directly (do NOT delegate):

- `notes/structure.yaml` — **the manifest** (see PHILOSOPHY §5). Record `title`, an
  optional `tagline`, then `domains` in onion order. Each domain has a `name`, an
  optional `caption`, and either `phases` (each with a `name` and its `pages`) or —
  for a single-phase domain — `pages` listed directly. Each page carries a globally
  unique `slug` (== its filename without `.md`), a `title`, and a `path` relative to
  the notes root. This manifest is the host-independent source of truth; a host skill
  reads it later to build navigation.
- `notes/CLAUDE.md` — seed it from `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md`
  so future edits to these notes stay consistent.

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
- The specific cross-links to make, given as target **slugs** (the author writes them
  as `[[slug]]` / `[[slug#heading|display]]` wikilinks).
- A strict scope line: **"Write ONLY this one file. Do not touch any other file."**
- Instruction to read `${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md` first.

### 6. VERIFY

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-content.js notes
```

This confirms the manifest is valid, slugs are unique, the manifest and the files on
disk cover each other (no orphans), every wikilink resolves to a known slug (and
heading), every footnote is defined, and no page carries host-specific markup. Fix any
findings (re-spawn the responsible author agent for content fixes; fix the manifest
yourself).

### 7. CLEANUP pass — a second editorial eye

The pages were written in parallel by separate agents that never saw each other's
output. Now that they all exist, the architect makes **one holistic pass** over the
whole site — you hold the only whole-site view, so this pass is yours alone. Read
the pages **together**, and edit in place to:

- **Consistency.** Align terminology, heading style, voice, and depth across pages so
  the site reads as one author. Reconcile anywhere two pages name or define the same
  thing differently.
- **Connection.** Add cross-links where one page re-encounters an idea another page
  owns, and point each page back to its prerequisite chapter(s) so the reading order
  is discoverable. Note-to-note links stay wikilinks (`[[slug]]`).
- **Content review.** Re-read each chapter as a fresh editor: tighten prose, fix gaps
  or inaccuracies, cut padding. Confirm each page still opens outcome-first and
  describes-then-names — plain language for the mechanics, no unrelated borrowed
  analogies, no jargon the foundation pages don't cover.
- **Structure.** Adjust architecture, page order, sidebar grouping, or prose wherever
  the through-line is weak. Move or merge pages if the onion order reads wrong now
  that the real content exists.

You may edit **any** file in this pass — this is the one step where the whole-notes
view outranks single-file scope. Keep `structure.yaml` in sync if you move, rename,
or reorder pages. Re-run `verify-content.js` after any structural or link edits.

### 8. Report, then point at a host

Summarize the domains, phases, and pages produced. Remind the user the notes are
**host-independent** — a folder of portable markdown plus `structure.yaml` — so they
can render them however they like:

- **docsify** — run `/notes-architect:na-host-docsify [notes-root]` to scaffold a
  themed, searchable docsify site from the manifest.
- **Obsidian / any wikilink-aware markdown vault** — open the folder directly; the
  `[[slug]]` links and footnotes work as-is.
- **Anything else** — the manifest describes the structure for any other host.

Don't assume a host or deploy anything. Offer to commit the notes.

---

## Important

- Never lead a page with a primitive or with code. Outcome first, then a plain
  jargon-free description of the system named with its standard term, specifics last —
  no unrelated borrowed analogies. Enforce this when reviewing agent output.
