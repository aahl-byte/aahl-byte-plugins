---
name: explaining
description: Load before explaining how anything works — a system, a codebase, an API, a decision, a concept — in docs, onboarding material, design docs, code comments, a PR walkthrough, or a chat answer. Covers how to order an explanation so it builds a mental model: start at the outcome and work leftward, layer it so the reader can stop at any depth, describe mechanics before naming them, and teach through the choice between options. Also load when an explanation is accurate but leaves the reader no better able to reason.
---

# Explaining

The product is understanding. An explanation can be complete and correct and still fail: if the reader finishes it unable to reason about the thing — to predict what it does next, or decide what to reach for — it failed.

`writing-style` governs the sentences. This governs what comes first, what depth to stop at, and what the reader is holding when they leave.

## Start at the outcome, work leftward

Reason from what someone is trying to accomplish and move leftward into the detail needed to get there. Name the destination before describing the road.

The default drift is the opposite: open at the smallest primitive — the config flag, the base class — and hope the reader assembles the picture. That order forces them to hold unattached facts until the payoff arrives, and most stop before it does.

Leftward movement surfaces categories before specific things, and specific things before their settings. The smallest details come last, once there is somewhere for them to land.

Check any section by its opening line: does it start with a thing a person wants, or a primitive? A primitive means the section is backwards.

## Layer it so the reader can stop anywhere

Build a coarse model first, then peel into specifics. Each layer must be true on its own terms, so a reader who quits at any depth still walks away with a correct — if rough — model.

1. **The mental model.** What the thing does and why it exists, in plain language.
2. **The moving parts.** The components and how they relate: what each is for, when you'd reach for it, what it replaces.
3. **The specifics.** Parameters, edge cases, exact syntax — the detail that only makes sense once the outer layers exist.

Simplify by omission: drop the detail the reader cannot use yet, and keep every claim you do make true at full depth. Fudging fails differently — "the scheduler is basically a queue", when it isn't one, sends the reader reasoning from queue semantics and getting wrong answers. Where a simplification will be revised later, say so as you make it.

The same shape repeats at every scale — a whole document, a section, a paragraph, a single answer. A five-line reply still opens with the outcome and lands the details last.

## Describe, then name

Explain the mechanics in plain, jargon-free terms; then attach the standard term to what you just described. The description does the teaching; the term is only its label, and now it has something to stick to.

Reaching to an unrelated domain for a metaphor is the analogy that falls flat — the reader ends up reasoning about the metaphor's rules instead of the system's. A genuinely apt comparison can follow the plain description; it never replaces it.

Assume common vocabulary. Define what is specific to this system.

## One hard idea at a time

Each paragraph introduces at most one thing the reader does not already have. When two hard ideas are entangled, teach the one the other depends on and name the second as a forward reference.

Watch for the sentence that smuggles in three new terms to define a fourth.

## Answer "why" and "what does it touch" before "what are its parameters"

New facts attach to a structure or wash out. The structure comes from what a thing is for and what it connects to. Given the backoff setting before the reason the retry wrapper exists, a reader has nowhere to put it.

## Contrast where options compete

Where several things could be used for the same job, the choice is the lesson. Give the condition that selects one: "use the streaming client when the response exceeds a few MB — the buffered one loads it all into memory."

This works only when both sides are real and the deciding factor is observable. Invented foils and unmeasured comparisons teach nothing; `writing-style` §3 covers that habit at the sentence level.

## Concrete before abstract

A worked example earns the right to state the general rule. Show one real case end to end, then generalize from it — the abstraction lands because the reader already has an instance to check it against.

For code: introduce the concept, then show the code as the example of it. Leading with a code block makes the reader reverse-engineer the point.

## Self-check

Read the finished explanation and ask:

- **Opening test.** Does it start with an outcome someone wants?
- **Stop test.** If the reader quits a third of the way in, is what they hold true?
- **Prediction test.** Could they now predict the system's behavior in a case you didn't cover? That is the difference between understanding and recall.
- **Orphan test.** Is any detail attached to nothing — a parameter, limit, or flag with no stated purpose? Attach it or cut it.
- **Jargon test.** Does any term appear before the thing it names was described?
