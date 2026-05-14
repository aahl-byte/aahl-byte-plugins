---
name: review-data
description: "Data model facet — schema changes, API endpoints, field status tracking, and annotated code diffs"
model: sonnet
---

# Data Review Agent

> **Hybrid facet. Write `data.config.yaml` AND `dynamic/data/*.svelte` files.**

You receive a review target (plan doc or branch diff) and an output directory path from the orchestrator. Read the target material, analyze schema and API changes, and write `data.config.yaml` plus dynamic Svelte code diff files to the output directory.

Read `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for the full component API and code diff rules.

## Process

1. **Read the target file(s)** — route handlers, Prisma models, SQL migrations
2. **Read the design/plan docs** — understand what is changing
3. **Identify schema changes** — new tables, modified columns, new indexes
4. **Identify API changes** — new/modified/removed endpoints, input/output shape changes
5. **Write `data.config.yaml`** to the output directory
6. **Write `dynamic/data/*.svelte`** files for each code file referenced in `codeFile` fields
7. **Validate** — run `node scripts/validate.js data.config.yaml` in the output directory and fix any errors

## Config Schema

```yaml
type: data
title: <string>

schemas:
  - id: <string>            # unique across schemas AND endpoints
    table: <string>         # fully qualified table name (e.g., "service.tech_story")
    status: <string>        # new | mod | del
    sections:
      - label: <string>     # section label (e.g., "Identity", "Content", "Audit")
        fields:
          - name: <string>  # column name
            dbType: <string> # PostgreSQL type
            apiType: <string> # TypeScript type in API response
            status: <string> # optional: new | join | drop (absent = unchanged)
    joins:                  # optional, fields from LEFT JOINs
      - name: <string>
        apiType: <string>
        source: <string>    # source table
    indexes:                # optional
      - name: <string>
        cols: <string>
        note: <string>      # optional
    codeFile: <string>      # optional, dynamic file ID for SQL query display

endpoints:
  - id: <string>            # unique across schemas AND endpoints
    method: <string>        # HTTP method
    path: <string>          # route path
    status: <string>        # new | mod | del
    input:                  # optional
      - name: <string>
        type: <string>
        status: <string>    # optional: new | drop
    output:                 # optional
      - name: <string>
        type: <string>
        status: <string>    # optional: new | drop
    codeFile: <string>      # optional, dynamic file ID
```

## Dynamic Content

Write code diff `.svelte` files to `dynamic/data/`. Each file referenced in `codeFile` must exist at `dynamic/data/<fileId>.svelte`.

See `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for the full component API.

## Content Guidelines

**Schema sections**: group fields by purpose (Identity, Content, Audit, Relationships). Each section gets a visual divider.

**Field status**: `new` (added), `join` (from LEFT JOIN), `drop` (being removed), absent (unchanged context).

**Joined fields**: list separately from section fields with the source table.

**Indexes**: list at the bottom with a note explaining why each exists.

**Endpoint cards**: list all input/output fields. Mark new ones with `status: new`, removed with `status: drop`.
