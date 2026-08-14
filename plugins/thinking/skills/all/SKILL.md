---
name: all
description: The whole thinking toolkit in one load — right-to-left planning, explanation structure, sentence craft, and the machine-writing habits to strip. Load this instead of right-to-left, explaining, and writing-style individually whenever a task needs more than one of them: a design doc, a plan, a PR body, onboarding material, a report, or any answer that has to both build understanding and read well. Also load for an edit pass over existing text or an existing plan.
---

# Thinking on the page

This merges `right-to-left`, `explaining`, and `writing-style`. Load those individually for a narrow task; load this when the work needs more than one, which is most work worth doing carefully.

The order below is the order to apply it: settle where you are going, order what you say so it builds understanding, then make the sentences carry it. The first layer is Bent Flyvbjerg's (*How Big Things Get Done*), the sentence craft is Joseph Williams' (*Style: Toward Clarity and Grace*), and the last section is a field guide to your own reflexes.

## 1. Fix the destination, then work leftward

Fix the end state first and derive everything else backward from it. Every step exists because something to its right needs it. Work drifts left to right — start from what you have, take the obvious next step, hope it adds up — and that order never checks whether a step was needed at all.

**Name the end state** in terms someone other than you could check. "Retries work" is not an end state. "A request that fails with 503 succeeds on the second attempt without the caller seeing an error, and the retry is visible in the trace" is. Two tests: name what a person could look at to confirm it, and name who does something differently once it lands. Do this before enumerating steps — the end state is what makes a step necessary, so a step list written first has no way to be wrong.

**Derive leftward.** From the end state, ask what must already be true for it to hold, then ask the same of each answer, until you reach something true today. That is where the work starts. Executing left to right is fine; deciding left to right is how scope arrives unexamined.

**Cut what nothing consumes.** For each item, name the downstream step, deliverable, or acceptance check that fails without it. Not "good practice", not "we'll need it eventually" — the specific consumer. Items with no consumer have recognizable shapes: the abstraction for a second caller that does not exist, the config knob nobody will turn, the section answering a question nobody asked. If one turns out to be needed, the step that needs it will ask for it by name.

For prose the same test is the **cut test**: if removing a sentence leaves the reader's next action unchanged, remove it. Most drafts shrink by half under it and lose nothing.

What the destination is, by domain:

- **A document.** What the reader does after reading. Lead with that — the blocker, the decision being asked for, what the reviewer must check. Background comes after the payload, for whoever wants it.
- **An explanation.** What the reader can reason about afterward. See §2.
- **A design.** The contract: the interface as its caller will use it, and what a caller can rely on. Derive the internals from that.
- **A plan.** The definition of done, written as acceptance checks. Phases are the leftward derivation; each phase is justified by the phase to its right.
- **An investigation.** The observed wrong behavior. Work leftward along the causal chain rather than forward from the first plausible suspect.
- **A refactor.** What the code lets someone do afterward that it does not let them do now.

When you genuinely cannot name the outcome yet, the first deliverable is the end state itself, and it gets the same treatment: what will you know at the end of the spike, and which decision does knowing it unblock? Do not substitute an unfalsifiable finish line ("the architecture is cleaner") — that produces a plan that can never be shown to be wrong, or done.

Two more things belong to this layer. Drafts are cheap and delivered documents are expensive to walk back, so restructure while it is still a draft; polishing sentences inside a broken outline is wasted work. And in plans and reports, write what is true — state risks, misses, and actuals plainly, with numbers where you have them. A plan that reads like a best case is a forecast error waiting to be found by someone else.

## 2. Order it so it builds understanding

The product is understanding. An explanation can be complete and correct and still fail: if the reader finishes it unable to predict what the thing does next, or decide what to reach for, it failed.

**Layer it so the reader can stop anywhere.** Build a coarse model first, then peel into specifics, with each layer true on its own terms:

1. **The mental model.** What the thing does and why it exists, in plain language.
2. **The moving parts.** The components and how they relate: what each is for, when you'd reach for it, what it replaces.
3. **The specifics.** Parameters, edge cases, exact syntax — detail that only makes sense once the outer layers exist.

Simplify by omission: drop what the reader cannot use yet, and keep every claim you do make true at full depth. Fudging fails differently — "the scheduler is basically a queue", when it isn't one, sends the reader reasoning from queue semantics and getting wrong answers. Where a simplification will be revised later, say so as you make it.

This shape repeats at every scale: a document, a section, a paragraph, a five-line reply.

**Describe, then name.** Explain the mechanics in plain terms, then attach the standard term to what you just described. The description does the teaching; the term is its label, and now it has something to stick to. Assume common vocabulary; define what is specific to this system. A metaphor reaching into an unrelated domain leaves the reader applying the metaphor's rules to the system — an apt comparison can follow the plain description, never replace it.

**One hard idea at a time.** Each paragraph introduces at most one thing the reader does not already have. When two are entangled, teach the one the other depends on and name the second as a forward reference. Watch for the sentence that smuggles in three new terms to define a fourth.

**Why and what-it-touches before parameters.** New facts attach to a structure or wash out, and the structure comes from what a thing is for and what it connects to. Given the backoff setting before the reason the retry wrapper exists, a reader has nowhere to put it.

**Concrete before abstract.** A worked example earns the right to state the general rule — show one real case end to end, then generalize, so the abstraction lands against an instance the reader can check it against. For code: introduce the concept, then show the code as its example. Leading with a code block makes the reader reverse-engineer the point.

**Contrast where options compete.** Where several things do the same job, the choice is the lesson: give the condition that selects one. "Use the streaming client when the response exceeds a few MB — the buffered one loads it all into memory." This works only when both sides are real and the deciding factor is observable; §4 covers the habit of inventing the other side.

## 3. How sentences work

- **Actors as subjects, actions as verbs.** e.g. "The parser rejects empty keys." When the verb has been buried in a noun (*rejection*, *implementation*, *utilization*), dig it out.
- **Familiar first, new last.** Open a sentence with what the reader already knows; put the new or complex material at the end, where the sentence's natural stress falls. This is also how paragraphs chain: the end of one sentence sets up the start of the next.
- **One point per paragraph, stated early.** The reader should be able to skim first sentences and get the argument.
- **Concision is deletion.** Cut metadiscourse ("it's worth noting that", "as mentioned above"), doubled words ("each and every"), and empty modifiers ("very", "quite", "essentially"). What survives, leave in full sentences — compression into fragments and arrow chains is a different vice.
- **Clarity is structural.** Complexity belongs in the content words, placed at the stress position; grammar that carries complexity makes the reader parse twice.
- **Vary sentence length.** A short sentence after two long ones lands hard. Uniform cadence reads as generated.

## 4. Machine habits to unlearn

Organized by the reflex underneath, because the surface forms mutate. Recognize the reflex and the whole family dies.

### False symmetry

The reflex: imposing a rhetorical shape the facts don't have.

- **Rule of three.** Triplet lists, triple adjectives, three parallel examples — regardless of how many facts exist. A list has exactly as many items as there are facts: often one, sometimes two, rarely a tidy three.
- **The contrived comparison.** "Not X, but Y" and every reformatting of it — the template survives any punctuation:
  - `{positive}. {negative}.` — "Report what you found. The search stays out."
  - `{positive} rather than {negative}` / `instead of` / `minus the` / `as opposed to`
  - "It isn't just X — it's Y." "This isn't about X; it's about Z."
  - Antithesis scaffolds: "Where A does this, B does that" as a rhythm; mirror-image sentence pairs.
  - Good/bad specimen pairs invented to flatter the good one.
  - A claim propped up by comparing two other unsupported claims.

**No comparison without data.** Nearly every comparison this reflex produces is contrived: neither half points at anything observable. Compare only when you can name the two real things being measured and the measurement — which is what makes §2's competing-options contrast legitimate. Otherwise use one of these:

- **State only the positive.** A precise positive implies the exclusion: e.g. "Report only the finding.", "Respond with one sentence."
- **Root the failure mode in its reasoning:** e.g. "A long narrative makes the reader dig for the answer.", "False comparisons degrade credibility."
- **Use a conditional or scope clause:** e.g. "Mention the search only when it changes the answer.", "If the mechanism changes the fix, explain it."

### Filler emphasis

The reflex: signaling importance the sentence has not earned. *Crucially*, *importantly*, *notably*, *robust*, *seamless*, *comprehensive*, *powerful*, *delve*, *deep dive*, *game-changing*, *key insight*. Replace each with the specific fact that makes it important, or cut: e.g. "The lock is held across the await, so every other request queues behind it."

### Over-structuring

The reflex: reaching for apparatus when prose would do.

- Headers over three sentences of content.
- Bullet walls where every item opens with a bolded phrase and a colon.
- Tables restating what the prose just said.
- Closing recaps ("In summary, we...") of a document short enough to remember.
- Nested lists more than two levels deep.

Default to paragraphs. Structure earns its place only where a reader will scan rather than read: reference material, checklists, option comparisons.

### Performed liveliness

The reflex: simulating energy. Rhetorical questions as transitions ("So what does this mean?"), "Here's the thing", "Let's dive in", exclamation points in technical prose, em-dash chains — three per sentence — that shatter the line, and one-word fragments. For punch. Energy in writing comes from verbs and specifics.

### Redundancy

The reflex: saying it again. Restating a point in different words for emphasis, a summary sentence that repeats its own bullets, "in other words", a definition followed by its paraphrase, and the trailing clause that re-explains what the example just showed. Each point gets said once, in its best form.

The test is new information, never surface similarity. A clause that echoes a rule's shape still earns its place when it carries a fact the rule alone doesn't: the reason behind the rule, the positive counterpart of a prohibition (what to do instead), the general principle an example instantiates, or the consequence that makes a constraint matter. "Never perform the sub-skill's work — your only job is to read state and invoke" is a don't plus its do; both halves inform. Cut only when the second telling adds nothing the first didn't, and then delete whichever version is weaker.

Over-emphasis is the same reflex in formatting: bold on every third phrase, ALL CAPS for volume, an exclamation where a period carries it. Emphasis spends from a small budget — a page with ten bolded phrases has none. Reserve bold for the one thing a scanner must not miss.

### Hedged authority

The reflex: qualifying every claim to avoid being wrong. Stacked hedges ("it could potentially, in some cases..."), "arguably", both-sides paragraphs where one answer is correct, and ending with "ultimately, it depends" when it doesn't. Commit to the claim you can defend and state the actual uncertainty once, precisely: e.g. "untested above 10k rows."

## 5. Edit pass

For cleaning existing text, in order:

1. Delete every sentence that fails the cut test (§1).
2. Find each list of three; check the facts. Merge, cut, or extend to the real count.
3. Find every comparison — `not `, `n't just`, `isn't about`, ` — it's `, `rather than`, `instead of`, `as opposed to`, and adjacent positive/negative sentence pairs. Keep only those backed by named, observable data; rewrite the rest as a precise positive, a reasoned failure mode, or a scope clause.
4. Delete filler-emphasis words or replace them with the earning fact.
5. Un-bullet anything that reads top-to-bottom; keep bullets only where the reader scans.
6. Rewrite nominalized sentences with actor-subject, action-verb.
7. Read for cadence; break up uniform sentence lengths and em-dash chains.
8. Cut restatements and the closing recap — sentences that add no new fact. Keep clauses that carry the reason, the what-to-do counterpart of a don't, or the principle behind an example.
9. Audit bold: keep it only on what a scanner must not miss.

## 6. Self-check

- **Destination.** Can you state the end state in one sentence someone else could verify? Can you name what consumes each item in the plan?
- **Opening.** Does the piece — and each section — start with an outcome someone wants, or with a primitive? A primitive means it is backwards.
- **Stop test.** If the reader quits a third of the way in, is what they hold true?
- **Prediction test.** Could they now predict behavior in a case you didn't cover? That is the difference between understanding and recall.
- **Orphan test.** Is any detail attached to nothing — a parameter, limit, or flag with no stated purpose? Attach it or cut it.
- **Jargon test.** Does any term appear before the thing it names was described?
