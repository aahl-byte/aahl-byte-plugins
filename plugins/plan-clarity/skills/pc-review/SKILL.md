---
name: pc-review
description: "Generate a multi-facet interactive design review. Orchestrates parallel agents to produce risk, execution, logic, data, and layout analysis as a single-file HTML."
---

# Plan Clarity Review

Generate an interactive multi-facet design review by orchestrating parallel analysis agents.

## Invocation

`/plan-clarity:pc-review`

Optional argument: facet names to restrict the run (e.g. `/plan-clarity:pc-review risk,logic`).

## Facets

| Facet | Agent | Model | Output |
|-------|-------|-------|--------|
| risk | `review-risk` | opus | `risk.config.yaml` |
| execution | `review-execution` | sonnet | `execution.config.yaml` |
| logic | `review-logic` | sonnet | `logic.config.yaml` + `dynamic/logic/*.svelte` |
| data | `review-data` | sonnet | `data.config.yaml` + `dynamic/data/*.svelte` |
| layout | `review-layout` | sonnet | `layout.config.yaml` + `dynamic/layout/*.svelte` |

## Workflow

### 1. Determine review target

Check the conversation for a plan doc, design doc, or implementation spec. If none is found, fall back to the branch diff (`git diff main...HEAD`). If ambiguous, ask the user what to review.

### 2. Scaffold

Run the init script to create the review directory:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/review/init.sh <name>
```

Where `<name>` is a short kebab-case slug derived from the review target (e.g. `avatar-upload`, `auth-refactor`). This creates `docs/review/<name>/` with the template, dependencies, and dynamic subdirectories.

### 3. Select facets

If the user specified facets (e.g. `/review risk,logic`), use those. Otherwise, infer from the target material:
- **Always include**: risk, execution (applicable to any change)
- **Include logic** if: route handlers, API endpoints, or store actions are changing
- **Include data** if: database schemas, migrations, or API response shapes are changing
- **Include layout** if: UI components, store shapes, or data flow patterns are changing

### 4. Spawn facet agents in parallel

For each selected facet, use the Agent tool to spawn the corresponding agent. Use `subagent_type` matching the agent name (e.g. `subagent_type: "plan-clarity:review-risk"`). Pass the `model` matching the agent's model frontmatter.

Each agent's prompt must include:
- The review target content (plan doc text, diff, or file paths to read)
- The output directory path (e.g. `docs/review/<name>/`)
- Instruction to read `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` (hybrid agents only)

**Do NOT set `isolation: worktree`** — agents must share the working directory to write to the same output path.

Spawn all agents in a single message with multiple Agent tool calls so they run in parallel.

### 5. Collect results

Wait for all agents to complete. For each:
- **Success**: log which config file was written
- **Failure**: log the error, continue with remaining facets

### 6. Start dev server

```bash
cd docs/review/<name> && bun run dev
```

Run in the background for live preview while reviewing output.

### 7. Build

```bash
cd docs/review/<name> && bun run build
```

Produces `dist/index.html` — a single-file HTML containing all facets.

### 8. Report

Summarize:
- Which facets completed successfully
- Which facets failed (with error message)
- Open the result: `start "" "docs/review/<name>/dist/index.html"` (Windows) or `open docs/review/<name>/dist/index.html` (macOS)

If any facets failed, tell the user they can retry individual facets with `/plan-clarity:pc-review <facet-name>`.

## Important

- The orchestrator does NO analysis itself. All review content is produced by facet agents.
- Do not set `isolation: worktree` on any agent — they need shared filesystem access.
- Hybrid agents (logic, data, layout) need `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for the Svelte component API.
