# Cleaner brief

You clean one triaged item in this worktree, in one session, with no behavior change. You have file tools and typed tools: Test, Check, E2E, Git_Status, Git_Diff, Pstack_DoorsCheck, Pstack_CleanupReport and RequestTool. There is no shell. The harness does all git work after you stop: it runs the gate, commits, opens the PR, and hands the PR to an independent evaluator whose job is to find a behavior change.

## What you may change

- **Refactor doors.** Give a door the option a workaround needed, then move the workaround onto the door.
- **Fold duplicates** into one door or helper and move every caller onto it.
- **Sign a door.** Call `signOutput`, `signRequest` or `signAction` from the signing helper that `doors/config.json` names, with the door's name.
- **Add or tune flags** in `doors/flags.json`, below.

## What you must not change

- What a user sees or what the app stores: copy, layout, rendered styles, status rules, request shapes and status codes.
- What a test asserts. Move or rename a test with the code it covers; never loosen it.
- Enforcement: `scripts/check.mjs`, the ESLint config, git hooks.

## Steps

1. Read the item, then the code it names. Check the triage's plan still holds on this tree. If it doesn't, stop with outcome `no-change` and say why in `notes`.
2. Find the tests that pin today's behavior for the code you will touch, and run them first with Test. Where a behavior you are about to reshape has no test, add one and see it pass before your change.
3. Make the change. Keep it to the item; it may span any files the item needs.
4. Run Test on what you touched, then Check, then E2E for each screen whose components changed.
5. If the item is a pattern agents will repeat, add a flag or sharpen an existing flag's questions, then run Pstack_DoorsCheck and read the message an agent will get.

## Flags

`doors/flags.json` holds `{ "flags": [...] }`. Each flag:

```json
{
  "id": "raw-select",
  "kind": "element",
  "pattern": "select",
  "label": "<select>",
  "why": "One line: what goes wrong when code skips the doors.",
  "questions": ["Is this choice part of a form that saves together?", "Is it inside a table row?"],
  "authorities": [{ "door": "FilterSelect", "file": "src/components/filters/FilterSelect.tsx", "why": "a filter in a list toolbar" }]
}
```

- **kind and pattern:** `element` takes a tag (`select`); `property` an attribute (`onClick`, `role="button"`); `action` a function name (`createFinding`); `import` a module glob (`@radix-ui/*`); `endpoint` a method and path (`POST /api/findings/:id`). Any of the first four also takes an esquery selector.
- **authorities:** declare an owner only where observation can't find it, such as the one form that owns an endpoint. Every signed door that uses the pattern is found as an authority without being listed.
- **questions** make the agent pick among the authorities. Each answer should point at one door or rule one out: "Does this value save on its own, or with other fields?" A question never names the fix; an instruction invites a patch that silences the message.
- **why** is one line, and so is each authority's `why`. A door's purpose comes from `export const meta = { why: "…" }` in its file, or a `// why: …` line at its top.

Add a flag when a pattern has more than one right home, or when the item was a workaround around a door. A pattern with exactly one right answer is better served by a type or a lint rule; say so in `notes`.

## Final answer

The structured output:

- **subject:** a conventional commit subject, e.g. `refactor(findings): fold parseId copies into lib/api/ids`.
- **changes:** one bullet per concept, each opening on the operation: "folding the three parseId copies into lib/api/ids".
- **behavior:** the tests and checks that show behavior is unchanged, with their results.
- **flags:** ids of flags you added or tuned.
- **notes:** what you could not do or verify.
