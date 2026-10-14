---
name: create-expert
description: Turn a session's accumulated knowledge of one domain into a standing expert agent any later session can call — a brief carrying the method and the failure modes with their tells, a store carrying the measured facts, and enough seeded findings that the first caller gets a true answer. Use when work on a domain is winding down and the session that did it is about to be lost, when a domain changes owner, when a contested domain needs a standing authority for spikes to consult, or when the same question keeps being re-derived from scratch.
---

# Create an expert

When this is done, there is an agent definition at `.claude/agents/<name>.md` and a store at `<experts>/<name>/` (by default `docs/research/experts/<name>/`). A session six months from now can call the agent and get an answer that is correct then, not merely correct when you wrote it.

Do it while the domain is still warm. The knowledge with the longest life is the knowledge you've stopped noticing you have, and it is the first thing lost when a session ends.

The templates are in `${CLAUDE_PLUGIN_ROOT}/references/templates/expert/` (the plugin root is two directories above this skill's base directory).

## The brief carries method; the store carries facts

The code changes faster than any brief can. A brief that names a threshold is wrong within a month, and a confidently wrong expert is worse than none, because callers believe it. So the two halves hold different things.

**The brief holds what survives a rewrite of the code:**

- the shape of the problem: what this stage of the work is for and what it hands on, stated in terms a user of the product would recognise;
- the invariants, the rules every moving value has to satisfy;
- the failure modes, each paired with its *tell*, the observation that means you are looking at it. An expert that recognises a mistake from its symptom saves more time than one that knows every current number.
- the way this domain's instruments lie. Every domain has a measurement that everyone reaches for and that quietly answers a different question. Name that one explicitly; it is the most valuable line in the brief.

The brief contains no number, constant name or count, and no file path except its own store's. Where the expert needs a value, the brief says where to look it up. Say outright in the brief why it has no numbers, so a later editor doesn't helpfully paste the current ones back in.

**The store holds every fact,** where the expert can correct it as it moves. It has three parts:

```
<experts>/<name>/
  README.md    what this expert owns, and how to read the rest
  STATUS.md    the current picture, rewritten in place, with untrue lines deleted
  notes/       one dated file per finding, never edited after it is written
```

- **`STATUS.md`** answers "where do things stand" in one read: what holds, what is in flight, and what is blocked and on whom. Name in-flight work by its task id and nothing more. A fact with two homes only ever gets corrected in one.
- **`notes/`** holds the durable evidence, one finding per file. Each note records what was measured, on what, the number, and the regime it holds in. When a later measurement overturns a note, write a new note and stop pointing `STATUS.md` at the old one.
- **Record the attacks that failed** as well as those that landed. Ground already covered is worth as much as ground broken, and without it the next session re-runs the same experiments.

The test of a draft: ask what breaks if the code is rewritten tomorrow. Whatever breaks is a fact, and it belongs in the store.

## 1. Mine your wrong turns first

Your finished work is the least useful thing you know, because it is in the code and the code gets read. What is written down nowhere is the time you lost, and each hour of it is a failure mode with a tell already attached.

Go and find them:

- read back your own dev log and task notes;
- run `git log` for reversals, re-measurements and abandoned approaches;
- look for everywhere you wrote "actually".

Each one yields three things: the mistake, the symptom you saw before you understood it, and what made that symptom mean that. Keep the symptom. It lets a future agent recognise the mistake before diagnosing it.

Then ask yourself directly: what would someone taking this over need to hear on day one to stop them losing the same week? Write every answer down before sorting any of it.

## 2. Write the store before the brief

The order does the sorting for you. Empty the facts into the store first: the measured findings, one dated note each, with what was measured, on what, the number, and the regime. Then write `STATUS.md`.

If work you are handing over has no task in the project's tracker, open one now and put the context in its notes. A task gets picked up; a paragraph in a status file does not.

Whatever you still want to say once the facts are out of your head is the method, and that is the brief.

**Don't hand the expert an empty store.** An expert with nothing to read writes nothing back. Its first caller then gets an agent reasoning from its brief alone, which is the confidently wrong case the split exists to prevent.

## 3. Write the brief

Start from `templates/expert/agent.md`. It carries:

- **The boundary, stated as a seam** in the pipeline ("you end where deciding which plants stand where begins"), plus an instruction to confirm the current code and owner from the repo, and to find whoever last touched a seam and ask them when it arrives at one.
- **"The code outranks the store,"** and correcting a stale entry is the expert's next piece of work when it finds one. Without that line, the store becomes a second source of truth that disagrees with the first.
- **The reporting contract.** Asked a question, the expert gives the finding first, then where it read it and how it is known, then what it couldn't settle. If it was asked for a number it didn't measure, it says so. Asked for work, it goes test-driven with the test mutated, and reports what the product can now do.
- **The house style.** `Skill` goes in `tools`, and the `thinking:all` instruction goes near the top.
- **The operating constraints a caller can't be trusted to pass on.** For this programme that means:
  - detached long runs with output to a file;
  - killing by PID;
  - explicit staging, with the staged diff read before committing;
  - local commits only;
  - model and effort set explicitly on every subagent it spawns (Opus at `high` for judgement, Sonnet at `medium` for mechanical work, never Fable).

  Add the domain's own constraints.
- **Its own model and effort in the frontmatter**: Opus at `high` for an expert that judges, which is nearly all of them.

Write the `description` for the caller's router. The first sentence says what the expert owns. The last says when to reach for it, including the case where someone is about to guess at a value the expert holds.

## 4. Prove the brief carries no facts

Grep the brief for digits. Every survivor is either an operating constant that is part of an instruction, or a fact you failed to move. Decide which, explicitly, for each one. Do the same for constant names, for file paths other than the store's, and for the names of current owners.

## 5. Prove it works before you stop

Call the agent you just made, with its model and effort set, and ask it something you already know the answer to, something that lives in the store rather than in the brief. Two things must happen: it reads the store, and it says where it read the value. An expert that answers from its brief hasn't been given enough. An expert that answers without saying where it looked will eventually answer from memory.

Then ask it something whose answer moved recently. If it gives you the old number, the store is stale on its first day, and fixing it is your last job before you go.

## Checklist

- [ ] No number, constant, count or path except the store's anywhere in the brief
- [ ] The store exists, with a README, a seeded `STATUS.md`, and real notes
- [ ] Failure modes named, each with its tell, and the domain's lying instrument named
- [ ] Boundary stated as a seam, with an instruction to confirm it
- [ ] "Code outranks the store" stated
- [ ] Reporting contract for both a question and a piece of work
- [ ] `Skill` in `tools`, and the `thinking:all` instruction near the top
- [ ] Operating constraints present, including model and effort on subagents
- [ ] `model` and `effort` set in the frontmatter
- [ ] `STATUS.md` names in-flight work by task id and restates none of it
- [ ] Called once on a stored fact, and once on a recently moved one
