# env-map: a deterministic map of the agent environment

## Outcome

Andrew opens one local page and sees, as diagrams, every part of the environment that acts on an agent session: what runs on which event, which job each part has taken over from the AI, what goes unchecked if a part breaks, and what changed since a chosen date. A fixed set of pattern flags marks the shapes that signal growing complexity, so he can steer the environment's architecture before a pile of small fixes turns it opaque.

Two properties are required:

- **Deterministic.** Code builds the page from files and git. No AI writes or summarizes anything at render time, and the same environment always produces the same page.
- **Explained.** Each part says why it exists. In the repos we control, the gate fails until the explanation is written.

## Scope

The map covers everything that acts on a session in a project:

- **Repo:** `.claude/settings*.json`, `scripts/` invoked by hooks, `.githooks/`, `CLAUDE.md`, project skills.
- **Global:** `~/.claude` settings, hooks, permission deny rules, `CLAUDE.md` and memories.
- **Plugins:** each installed plugin's skills, agents and hooks.

Parts in repos we control are **ours**: inspection-app, aahl-byte-plugins, and the pstack fork inside it. Parts anywhere else are **external**: the global `~/.claude` setup, the Watchtower hooks and the official plugins. External parts are drawn with their source and version, and the "why" gate doesn't block on them.

## Section 1: what is on the map

A **box** is one thing that acts on a session:

- a hook, and the script it calls
- a rule inside a script
- a skill or an agent
- a `CLAUDE.md` file
- a git hook
- a permission deny rule

Supporting files (playbooks, references) belong to their skill and don't get their own box.

| Fact | Source | Author |
|---|---|---|
| `why`, `layer`, `takes` | Frontmatter for markdown (skills, agents, `CLAUDE.md`). An exported `meta` object for scripts and for each rule inside one. | Written once, reviewed in the PR |
| Trigger event and matcher | `settings.json` at each level, plugin `hooks.json`, `.githooks/` | Parsed |
| Owner: ours, or external with source and version | Path, plugin marketplace records | Parsed |
| Reach, blast radius | The event → hook → script → rule graph | Computed |
| Last changed, change count | `git log` | Computed |

Arrows connect three kinds of pair: an event to its hook, script and rule; a skill to another skill it names (`pstack:x`); and a `CLAUDE.md` rule-table row to its enforcer.

Every hook command must call a file, because Claude Code may reject unknown keys in `settings.json`. The "why" lives in that file. A one-line existence guard such as `[ -f "$f" ] || exit 0` counts as plumbing and is allowed.

## Section 2: views

Each view answers one question. ELK lays out the page, so the same graph always gets the same picture.

1. **Lifecycle: what runs when?** A horizontal timeline of events: session start, worktree create, each tool call (before and after), stop, commit, merge, `wt gc`. Each box hangs under the event that fires it, colored by layer.
2. **Responsibilities: who holds each job?** One column per layer (prose, check, test, design), with each `takes` id placed in the column of whatever holds it.
3. **Dependencies and blast radius: what breaks if this breaks?** The full graph. Clicking a box highlights everything downstream that would go unchecked.
4. **Compare to: what changed?** Pick a git ref or a date, and every view marks boxes added (green outline) and removed (red), and draws an arrow for each responsibility that moved.

**Pattern flags** appear as badges on boxes and are listed in a side panel. Each one is a fixed rule, with its threshold in one config file:

- **Crowded event:** more than N hooks on one event.
- **Overlap:** two rules match the same command or path pattern.
- **Unenforced prose:** a `CLAUDE.md` row with no enforcer, or a prose-layer skill touched recently.
- **Churn:** more than K changes to one file within W days.
- **Cross-boundary edge:** an external hook that acts on repo commands.
- **Orphan:** a script that nothing calls, or a skill that nothing names or triggers.

## Section 3: build, gate, proof

**Location.** The map is a new plugin, `plugins/env-map`. The pstack fork stays her code plus our renames, so `upstream-diff.sh` shows only upstream changes.

**Pipeline:**

1. **Collect.** One parser per source.
2. **Graph.** Write `graph.json` with sorted keys and stable ids.
3. **Render.** Write a single self-contained HTML page with ELK bundled to `.claude/env-map/index.html` (gitignored), and view it through Watchtower.
4. **Snapshot.** Keep a dated copy of `graph.json` from each run. "Compare to" reads git history for parts that are ours and these snapshots for `~/.claude`, which has no git history.

**Triggers.** A SessionStart hook runs the map in the background, and `npm run env-map` runs it by hand.

**Gate: `env-map check`.** It fails on any of:

- an inline hook command
- a part we own with no `why`, `layer` or `takes`
- a `layer` outside `design | type | check | test | verify | prose`
- a `takes` id missing from `responsibilities.yaml`, the controlled list of jobs, one line each. Adding a job means adding a line to it, which shows up in review.

inspection-app's `scripts/check.mjs` calls the gate, and so does a pre-commit hook in aahl-byte-plugins. Each failure message names the missing field and the file.

**Failure stays visible.** A source that fails to parse is drawn as a red "unreadable" box carrying the error, and it is never dropped. The footer shows the generation time and every source read.

**Proof.** Each of these must fail before its fix and pass after it:

- a golden test: fixture environment to expected `graph.json`
- one fixture per pattern flag, which must trip that flag
- one fixture with a missing `why`, which must fail the gate
- an end-to-end probe: a fresh session start regenerates the page

## Rollout

1. Apply `plugins/pstack/TRIAGE.md`, so no "why" gets written for parts about to be deleted. This step waits on Andrew's approval of the list.
2. Build `plugins/env-map`: the parsers, the graph, the views, the flags and the gate, with the proofs above.
3. Backfill `why`, `layer` and `takes` in inspection-app (about 8 parts) and in pstack (about 50 after triage), then turn the gate on in both repos.

## Out of scope

- Per-PR diagram comments. Andrew chose a local page, and "compare to" covers the diff.
- Firing counts from a mistake ledger. That ledger is a separate piece of work; when it exists, its counts become one more parsed fact on each box.
