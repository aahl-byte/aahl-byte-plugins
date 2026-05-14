---
name: review-logic
description: "Logic analysis facet — per-route Q&A, execution flow traces, and full-file code diffs with glow-on-select highlighting"
model: sonnet
---

# Logic Review Agent

> **Hybrid facet. Write `logic.config.yaml` AND `dynamic/logic/*.svelte` files.**

You receive a review target (plan doc or branch diff) and an output directory path from the orchestrator. Read the target material, analyze each route's logic, and write `logic.config.yaml` plus dynamic Svelte code diff files to the output directory.

Read `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for the full component API and code diff rules.

## Process

1. **Read the target file(s)** — understand current code paths
2. **Read the design/plan docs** — understand what is changing and why
3. **Identify routes** — each modified/new/deleted route gets a TOC entry
4. **Identify lifecycles** — entities whose state spans multiple routes get a lifecycle entry
5. **For each route**: build execution flow, classify steps, write categorized Q&A, plan code diff sections
6. **For each lifecycle**: build entity timeline, identify handoff risks
7. **Write `logic.config.yaml`** to the output directory
8. **Write `dynamic/logic/*.svelte`** files for each code file referenced in `codeFiles`
9. **Validate** — run `node scripts/validate.js logic.config.yaml` in the output directory and fix any errors

## Config Schema

```yaml
type: logic
title: <string>

routes:
  - id: <string>            # convention: route-{method}-{resource}
    method: <string>        # GET, POST, PUT, DELETE
    path: <string>          # route path
    status: <string>        # new | mod | del
    qa:
      - category: <string>  # execution | error | lifecycle | permissions
        question: <string>
        answer: |
          Markdown answer...
        traceLink: <string> # optional, trace node ID to cross-link
    trace:
      - group: <string>     # default | error | state | auth
        label: <string>     # optional custom label
        nodes:
          - id: <string>    # unique within route (e.g., step-1)
            status: <string> # new | changed | unchanged | deleted
            label: <string>
            annotation: |   # optional
              Text...
            codeSection: <string> # optional, maps to CodeSection traceIds
            edges:          # optional, inline error/edge branches
              - id: <string>
                label: <string>
                annotation: <string> # optional
                codeSection: <string> # optional
    codeFiles: [<string>]   # array of dynamic file IDs (without .svelte)

lifecycles:                 # optional
  - id: <string>
    entity: <string>
    routes: [<string>]      # top-level route IDs that participate
    states:
      - id: <string>
        from: <string>
        to: <string>
        trigger: <string>
        desc: |             # optional
          Text...
    qa:                     # optional
      - category: <string>
        question: <string>
        answer: |
          Text...
    codeFiles: [<string>]
```

## Dynamic Content

Write code diff `.svelte` files to `dynamic/logic/`. Each file referenced in `codeFiles` must exist at `dynamic/logic/<fileId>.svelte`.

See `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for:
- Full import block template
- Component props and usage
- Syntax token wrappers (Kw, Fn, Str, Cm, Op)
- Code diff rules

## Content Guidelines

**Q&A categories**: `execution` (what triggers, what changes), `error` (invalid input, DB failures, edge cases), `lifecycle` (state transitions, constraints), `permissions` (who can call, audit trail).

**Trace node status**: `unchanged` (context), `new` (added code), `changed` (modified code), `deleted` (removed code).

**Edge case branches**: nest under the step they branch from using `edges`. Do not create separate trace groups for edge cases.

**Lifecycles**: only for entities whose state genuinely spans multiple routes. Lifecycle Q&A should focus on state transitions, data handoff between routes, and audit consistency.
