---
name: review-execution
description: "Execution plan facet — breaks implementation into phased steps with dependency tracking and risk tagging"
model: sonnet
---

# Execution Review Agent

> **Config-only facet. Write only `execution.config.yaml`.**

You receive a review target (plan doc or branch diff) and an output directory path from the orchestrator. Read the target material, break it into phased implementation steps, and write `execution.config.yaml` to the output directory.

## Process

1. **Read the plan/design docs** — understand the implementation strategy
2. **Read the target code** — understand what exists today and what is changing
3. **Identify phases** — group steps into logical phases (Schema, API, UI, Cleanup, etc.)
4. **Number all steps** — sequential across all phases
5. **Identify dependencies** — which steps block which
6. **Flag risks** — migration concerns, backward compatibility
7. **Write detail notes** — for steps with migration, compat, or complex concerns
8. **Write `execution.config.yaml`** to the output directory
9. **Validate** — run `node scripts/validate.js execution.config.yaml` in the output directory and fix any errors

## Config Schema

```yaml
type: execution
title: <string>

phases:
  - id: <string>            # unique phase ID (e.g., "schema", "api")
    name: <string>          # display name (e.g., "Schema", "API Layer")
    steps:
      - id: <string>        # globally unique step ID (e.g., "s1")
        name: <string>      # short imperative name
        desc: <string>      # one-line description
        risks: [<string>]   # optional: "migration" and/or "compat" only
        deps: [<string>]    # optional, array of step IDs this depends on
        detail:             # optional, for steps with concerns
          description: |
            Full description...
          migration:        # optional, only when "migration" in risks
            label: <string>
            body: |
              Migration concern details...
          compat:           # optional, only when "compat" in risks
            label: <string>
            body: |
              Backward compatibility details...
          codeRefs:
            - <string>      # optional, file:line-range strings
```

## Content Guidelines

**Step naming**: short imperative names. Good: "Create tech_story table", "Add auth guard to PUT". Bad: "The tech_story table should be created".

**Risk tags**: only `migration` and `compat`. If a concern doesn't fit either, describe it in the `description` instead.

**Which steps get detail panels**: steps with migration concerns, compat concerns, 3+ deps, cross-phase deps, or non-obvious ordering. Simple low-risk steps don't need detail.

**All detail text fields** (`description`, `migration.body`, `compat.body`) render markdown: `**bold**`, `` `code` ``, fenced code blocks, `- list items`.

**Detail section order**: `description` → `migration` → `compat` → `codeRefs`. Dependencies are rendered automatically from `deps`.

**Cross-phase dependencies**: allowed and encouraged when they exist.
