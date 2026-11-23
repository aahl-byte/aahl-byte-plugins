---
name: cleanup
description: "Run one cleanup round on a repo that uses doors and flags: report duplicates, flag findings, raw elements, unsigned requests and seeds; triage each item real or pedantic with a reason; clean each real item in a fresh session with no behavior change; have an independent Fable evaluator pass or fail each PR; then tune this skill or the flags from what the evaluator found twice. Use for /pstack:cleanup, a scheduled cleanup, or a request to clean up duplicates, workarounds or door flags."
---

# Cleanup

Feature work leaks: a component rebuilt from scratch, a workaround around a door, a raw element where a door exists. Nothing stops a feature for these. A cleanup round collects them in a batch, folds them into doors, and sharpens the flags so the next feature agent finds the right door on its own.

## The model

- **A door** is the sanctioned way to do something. It signs its work through the repo's signing helper: `signOutput(name)` on what it renders, `signRequest(name, init)` on its fetches, `signAction(name, action)` on its server actions. Any file that signs, or sits in a door folder, is a door.
- **A flag** marks a pattern worth watching: an element, a property, an import, an action or an endpoint. Every door that uses the pattern is an authority on it. When unsigned code uses it, the flag lists each authority with what it is for and asks its probing questions. It aids discovery; it gives no instruction.
- **Cleanup** reads what got through and changes the doors and the flags. It never changes behavior.

## One round

`scripts/cleanup/round.mjs` in this plugin is the harness. It does every git step; sessions only edit files.

```
node <pstack>/scripts/cleanup/round.mjs --repo <main checkout> [--dry-run] [--items <id,id>]
```

1. **Report.** `scripts/cleanup/report.mjs` runs on a detached checkout of `origin/cleanup` and writes `report.json` and `report.md`. Each item has an id, kind, files, evidence and size.
2. **Triage.** A read-only session (opus, high) judges every item real or pedantic, each with a one-line reason, and gives each real item a one-line plan. An item that needs a person's call carries a `question` and waits. The harness validates the triage against the report and writes `triage.json`; an invalid one gets one fresh session. Brief: `references/triage.md`.
3. **Clean.** Each real item gets a fresh worktree from `origin/cleanup` and a fresh session on the agent-tools `cleanup` role (opus, high, no shell). It may refactor doors, fold duplicates, sign doors, and add or tune flags with probing questions. Then the harness runs the gate, commits, pushes and opens a PR into `cleanup`. Brief: `references/cleaner.md`.
4. **Evaluate.** A Fable session (high) on the `verify` role gets the item, the diff and the tests and e2e. It returns PASS, or FAIL with evidence: a failing command, a screenshot or an observed behavior difference. PASS merges into `cleanup`; FAIL leaves the PR open. Brief: `references/evaluator.md`.
5. **Tune.** Read `runs/<round>.jsonl`. An evaluator finding seen twice becomes a change to the cleaner brief, to this skill, or to a flag. That is `/pstack:correct` applied to the cleaner: fix the class at the highest level that works, and prove the change on the item that showed it.

A failed item is rerun as a fresh session from `origin/cleanup` (`--items <id>`), never by resuming or repairing the old one.

## Output

Under `--out` (default `<repo>/tmp/cleanup`): `<round>/report.{json,md}`, `<round>/triage.json`, `<round>/plan.json`, `<round>/summary.md`, each session's stream log in `<round>/sessions/`, and per cleaned item one line in `runs/<round>.jsonl` with its triage reason, session costs and times, gate, PR, verdict and findings.

## Setting up a repo

`node <pstack>/scripts/doors/install.mjs --repo <dir> --door-folder <dir>` writes the signing helper, the e2e request recorder, `doors/config.json`, an empty `doors/flags.json`, `cleanup/config.json` and an empty `cleanup/seeds.json`. Then:

- run `scripts/doors/check.mjs --report-only --files <changed files>` in the gate;
- add `recordDoorRequests` as an auto fixture in the Playwright fixtures;
- point `cleanup/config.json` at the repo's worktree tool and gate;
- write the known leaks into `cleanup/seeds.json`.

Ship the flag file empty. Rounds add flags as they find patterns worth discovering.

**Reply:** the round's counts by section, real and pedantic with a few reasons each, every item's outcome with its PR and verdict, and any evaluator finding that has now been seen twice with the change it became.
