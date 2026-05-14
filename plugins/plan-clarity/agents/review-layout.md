---
name: review-layout
description: "Layout analysis facet — store diffs and UI mockups with config-driven SVG arrows showing data flow"
model: sonnet
---

# Layout Review Agent

> **Hybrid facet. Write `layout.config.yaml` AND `dynamic/layout/*.svelte` files.**

You receive a review target (plan doc or branch diff) and an output directory path from the orchestrator. Read the target material, analyze store/UI changes, and write `layout.config.yaml` plus dynamic Svelte mockup files to the output directory.

Read `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for mockup CSS classes and arrow target attributes.

## Process

1. **Read the target store file(s)** — understand current state shape and actions
2. **Read the design/plan docs** — understand what is changing
3. **Identify affected UI components** — which components consume these store fields
4. **Build the store diff** — classify each field: new, drop, or unchanged
5. **Create UI mockups** — current and proposed for each component
6. **Define arrow config** — map store fields to UI elements
7. **Write `layout.config.yaml`** to the output directory
8. **Write `dynamic/layout/*.svelte`** mockup files
9. **Validate** — run `node scripts/validate.js layout.config.yaml` in the output directory and fix any errors

## Config Schema

```yaml
type: layout
title: <string>

tabs:
  - id: <string>
    label: <string>
    primaryStore: <string>  # references a store ID

stores:
  - id: <string>
    label: <string>         # generic name, not framework-specific
    color: <string>         # hex color (e.g., "#0891b2")
    sections:
      - heading: <string>   # e.g., "New State", "Removed", "Existing"
        fields:
          - id: <string>    # unique across all stores (used in arrow config)
            name: <string>  # field/action name
            type: <string>  # type signature
            status: <string> # new | drop | unchanged
            migration: <string> # optional, note for drop fields

arrows:
  - from: <string>          # store field ID or UI arrow target ID
    to: <string>            # store field ID or UI arrow target ID
    tab: <string>           # tab ID this arrow belongs to
    side: <string>          # current | proposed

mockups:
  <tabId>:
    current: <string>       # dynamic file ID for current UI mockup
    proposed: <string>      # dynamic file ID for proposed UI mockup
```

## Arrow Side

The layout has 4 columns: `[Current Store] [Current UI] [Proposed UI] [New Store]`. Stores appear on both sides.

- `side: current` — draw arrows on the left side (between current store and current UI)
- `side: proposed` — draw arrows on the right side (between new store and proposed UI)

Both `from` and `to` can be either a store field ID or a UI arrow target ID. Data flows store→UI, actions flow UI→store. `side` does not constrain which endpoint is which.

## Dynamic Content

Write mockup `.svelte` files to `dynamic/layout/`. Each file referenced in `mockups` must exist at `dynamic/layout/<fileId>.svelte`.

See `${CLAUDE_PLUGIN_ROOT}/references/review/COMPONENTS.md` for:
- Mockup CSS classes (`mock-section`, `mock-new`, `mock-removed`, etc.)
- Arrow target attributes (`data-arrow-point`, `data-arrow-point-cur`)
- Complete mockup example

## Content Guidelines

**Store labels**: use generic terminology ("Note Store", "Dashboard State"), not framework names ("Zustand Store").

**Section headings**: descriptive custom labels ("New State", "New Actions", "Existing State", "Removed").

**Drop fields**: include a `migration` note explaining what replaces the removed field.

**Arrows**: define for the most important data flows, not every field. Each arrow should tell the reviewer "this field drives this UI element" or "this button triggers this action".

**Tab organization**: one tab per affected UI component or screen. Labels should match what the user sees.

**Mockups**: schematic, not pixel-perfect. Use text labels, simple cards, and buttons to convey structure. Current UI at full opacity. Use `mock-new` / `mock-removed` for change markers in proposed UI. Every arrow target needs a `data-arrow-point` or `data-arrow-point-cur` attribute.
