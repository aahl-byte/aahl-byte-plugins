---
name: right-to-left
description: Load before planning any piece of work — a feature, a migration, a document, an investigation, a refactor — and whenever a plan is a list of steps with no stated finish line. Covers how to fix the end state first, derive each step from what the step to its right needs, and cut the work nothing consumes. Also load mid-flight when it has become unclear what "done" means, or when a design is accreting parts whose purpose nobody can name.
---

# Right to left

Fix the end state first, then derive everything else backward from it. Every step exists because something to its right needs it. A step nothing needs does not exist.

The name is Bent Flyvbjerg's (*How Big Things Get Done*): the rightmost box on the diagram is the outcome, and every box to its left is a means of reaching it. Work drifts left to right — start from what you have, take the obvious next step, hope it adds up — and that order never checks whether a step was needed at all.

## Name the end state

Write down what is true when this is finished, in terms someone other than you could check. "Retries work" is not an end state. "A request that fails with 503 succeeds on the second attempt without the caller seeing an error, and the retry is visible in the trace" is.

Two tests for whether you have one:

- **Observable.** Name what a person could look at to confirm it. If confirming it requires reading the diff, the end state is a description of the work, not of the outcome.
- **Someone's day changes.** Name who does something differently once this lands, and what. Work whose end state changes nobody's day is worth questioning before it is worth planning.

Do this before enumerating steps. The end state is what makes a step necessary or unnecessary, so a step list written first has no way to be wrong.

## Derive leftward

From the end state, ask what must already be true for it to hold. Then ask the same of each answer. Stop when you reach something that is already true today — that is where the work starts.

The chain runs the other way from how you will execute it. That is the point: executing left to right is fine, deciding left to right is how scope arrives unexamined.

Movement leftward also orders things by size. Categories surface before specific things, and specific things before their settings. The smallest details come last, once there is somewhere for them to land — which is why a plan that opens on a config flag or a base class is backwards.

## Cut what nothing consumes

For each item in the plan, name what to its right consumes it. Not "it's good practice", not "we'll need it eventually" — name the specific downstream step, deliverable, or acceptance check that fails without it.

Items with no named consumer come in recognizable shapes: the abstraction added for a second caller that does not exist, the config knob nobody will turn, the migration step for data nobody reads, the section of a document that answers a question nobody asked. Cut them. If one turns out to be needed, the step that needs it will ask for it by name.

The same test applied to prose is the cut test: if removing a sentence leaves the reader's next action unchanged, remove it.

## What this looks like in each domain

- **A document.** The end state is what the reader does after reading. Lead with that — the blocker, the decision being asked for, what the reviewer must check. Background comes after the payload, for whoever wants it.
- **A design.** The end state is the contract: the interface as its caller will use it, and what a caller can rely on. Derive the internals from that, not the reverse.
- **A plan.** The end state is the definition of done, written as acceptance checks. Phases are the leftward derivation; each phase's justification is the phase to its right.
- **An investigation.** The end state is the observed wrong behavior. Work leftward along the causal chain — what must have been true for this output to appear — rather than forward from the first plausible suspect.
- **A refactor.** The end state is what the code lets someone do afterward that it does not let them do now. Absent that, the refactor has no finish line and will not have one later either.

## When the end state is genuinely unknown

Sometimes you cannot name the outcome because the information to name it does not exist yet. Then the first deliverable is the end state itself, and it gets the same treatment: what will you know at the end of the spike, and which decision does knowing it unblock? A spike whose consumer is unnamed is the same defect one level up.

Do not fake it by writing an end state you cannot check. An unfalsifiable finish line ("the architecture is cleaner") produces a plan that can never be shown to be wrong, or done.

## Self-check

- Can you state the end state in one sentence someone else could verify?
- For every item in the plan, can you name what consumes it?
- Does the plan open on an outcome, or on a primitive?
- Is anything in the plan justified only by what precedes it?
