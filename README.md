# aahl-byte plugins

Claude Code plugins, served from this repo as the `aahl-byte` marketplace.

- **plan-clarity** — multi-facet interactive design review; parallel agents produce risk, execution, logic, data, and layout reviews as a single-file HTML
- **spec-management** — living architecture documentation; audit, create, and maintain spec files with parent/child hierarchy, source tracking, and staleness detection
- **dev-kernel** — end-to-end AI dev pipeline (vision → design → plan → review → execute) built from context-isolated skills
- **notes-architect** — living study-notes sites; decomposes a topic right→left into onion tiers, delegates one sub-agent per page, hosts via docsify
- **thinking** — habits of clear thought on the page: writing-style for sentence craft, explaining for building a reader's mental model

# Plan Clarity

`/pc-review --help`

the plan-clarity plugin generates a static html to reduce the cognitive load of reviewing a plan.
it has the added benefit of improving the quality and clarity of a plan

- see intended diffs
- see data structures and transformations
- outline logic flows and where logic is added, transformed or removed
- see data lifecycles and how this plan will change them
- list questions and concerns categorized and ranked by severity and make it easy to respond to all of them at once.
- outline execution steps and phases with annotations

it currently has a few behaviors that I still want to change
- api page is redundant with logic page
- difficult/slow to make edits
- I would like to make the code diffs more consistent by using real code diffs and applying some sort of comment style syntax for annotations

## screenshots

!TODO - I'll post screenshots in a bit

## dependencies

``` bash
npm i -g bun live-server
```

- `bun` reduces the size of the `node_modules` on disk by using hardlinks. useful when we have multiple reviews.
- live-server auto-updates the html on edit/build

## how to use

call `/pc-review` or `/plan-clarity:pc-review` and point it to the plan or code you want to present. It will decide which phases are appropriate to display and execute sub-agents to build those pages.

a svelte website will be created in `/docs/review/`

``` bash
cd /docs/review/{name} && bun i
```

``` bash
bun dev # see live app - edits appear as they're made, may be annoying as the page tends to reset while you're looking at it
```

``` bash
bun run build && cd dist && live-server index.html # app only refreshes after all changes are made and `bun run build` is called
```
