---
name: na-host-docsify
description: "Render an existing host-independent notes/ folder (structure.yaml + portable markdown) as a docsify site: scaffold the themed shell, generate navigation + a wikilink map from the manifest, wire wikilink rendering, and verify the built site."
argument-hint: "[notes-root]"
---

# na-host-docsify

You turn an existing **host-independent** set of notes into a **docsify site**. The
notes were produced by `na-build-notes` (or by hand): a folder containing a
`structure.yaml` manifest plus portable markdown pages with `[[slug]]` wikilinks and
`[^id]` footnotes. You do NOT write or edit note content — you only add the docsify
hosting layer around it.

`${CLAUDE_PLUGIN_ROOT}/references/PHILOSOPHY.md` describes the manifest and the
content contract; read it if you need the structure's meaning. Everything this skill
does is mechanical: read the manifest, generate the host files, verify.

## Invocation

`/notes-architect:na-host-docsify [notes-root]`

- `[notes-root]` — the notes folder to host (default `notes/`). It MUST already
  contain `structure.yaml`.

## Workflow

### 1. Check the notes exist

Confirm `<notes-root>/structure.yaml` exists. If it doesn't, stop and tell the user to
run `/notes-architect:na-build-notes <topic>` first — this skill hosts existing notes,
it does not create them.

### 2. Verify the content first

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-content.js <notes-root>
```

This confirms the manifest is valid, slugs are unique, pages and manifest cover each
other, every wikilink and footnote resolves, and no page carries host markup. **Run
this BEFORE scaffolding** — once the host files (`home.md`, `_sidebar.md`, …) are
written into the root, they are host-owned, not content, so re-running content-verify
afterward will (correctly) see them as extra files. Host the notes only once content
verifies clean.

### 3. Scaffold the docsify shell

```bash
bash ${CLAUDE_PLUGIN_ROOT}/host/docsify/init.sh <notes-root>
```

This copies the themed shell into the root: `index.html` (docsify config + the
`notesSearch` and `wikilinks` plugins), `css/globals.css` (the dark theme + two-scale
sidebar styling), `wikilink-render.js`, `search.md`, and `.nojekyll`. It refuses to
clobber an existing site (it checks for `index.html`).

### 4. Generate navigation + the wikilink map from the manifest

```bash
node ${CLAUDE_PLUGIN_ROOT}/host/docsify/build.js <notes-root>
```

This reads `structure.yaml` and writes, into the root:

- `_sidebar.md` — the two-scale onion (domains → phases → pages) docsify renders and
  `notesSearch` parses for breadcrumbs.
- `_notes-map.json` — the `slug → /path.md` map the `wikilinks` plugin uses to turn
  `[[slug#heading|alias]]` into real links at view time.
- `_coverpage.md`, `_navbar.md`, `home.md` — the landing experience, filled from the
  manifest's `title` and `tagline`.

Re-run this any time the notes or the manifest change.

### 5. Verify the built site

```bash
node ${CLAUDE_PLUGIN_ROOT}/host/docsify/verify-host.js <notes-root>
```

Confirms the shell is present and themed, every generated file exists, `_sidebar.md`
covers every manifest page, and `_notes-map.json` matches the manifest's slugs. Fix
any findings (usually: re-run step 4, or fix the manifest in the content layer).

### 6. Preview

```bash
cd <notes-root> && python3 -m http.server 8080
```

Then open the served URL. Spot-check: the cover page, a couple of pages, that
`[[wikilinks]]` render as working links, that footnotes appear, and that search returns
results with the domain · phase · chapter breadcrumb.

### 7. Offer deployment — don't assume

Ask how the user wants to publish. Offer:

- **GitHub Pages (recommended)** — serverless, free, no build. Copy the workflow:
  ```bash
  mkdir -p .github/workflows
  cp ${CLAUDE_PLUGIN_ROOT}/host/docsify/deploy/github-pages.yml .github/workflows/deploy-pages.yml
  ```
  Docsify is a no-build static site, so the workflow publishes `<notes-root>/` as-is
  (`.nojekyll` is present). Check the `branches:` value matches their default branch,
  and the `paths:`/`path:` values match the notes root. Remind them to enable Pages →
  "GitHub Actions" in repo settings.
- **Another static host** (Netlify / Vercel / Cloudflare Pages / S3) — point it at the
  notes root as the publish directory; there is no build command.
- **Local only** — nothing more to do.

Optionally offer the convenience `Makefile` (`make serve/open/stop/build/verify`):
```bash
cp ${CLAUDE_PLUGIN_ROOT}/host/docsify/deploy/Makefile ./Makefile
```

Finally, offer to commit (and, if asked, push) the hosted site.

---

## Important

- This skill is **idempotent over the manifest**: re-running steps 3–5 after the notes
  change regenerates nav, the wikilink map, and the landing from `structure.yaml`.
- Never edit note bodies here — if content is wrong, fix it in the content layer and
  re-run from step 2. The generated files (`_sidebar.md`, `_notes-map.json`,
  `_coverpage.md`, `_navbar.md`, `home.md`) are host artifacts; don't hand-edit them
  either — change the manifest and rebuild.
