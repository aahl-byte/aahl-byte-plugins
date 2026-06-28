# Test fixtures

`fixtures/sample-notes/` is the canonical host-independent note tree. It is used
by the `verify-content` tests and by the host build/verify tests as a shared,
stable input.

It deliberately exercises the tricky cases:

- a multi-phase domain (`global foundation` has both `foundation` and
  `building blocks` phases),
- a heading-qualified wikilink (`[[slug#heading]]`),
- an aliased wikilink (`[[slug|alias]]`), and
- per-page footnotes (`[^1]`).

Treat these notes as fixed: later tests assert on their exact contents (for
example, the `what-is-x` H1 must slugify to `what-is-x`, and the event-loop page
must keep its `## phases` heading).
