---
name: writing-style
description: Load before writing any substantial prose for a human reader — docs, README files, PR bodies, reports, plans, design docs, commit messages, or a chat answer longer than a few sentences. Also load when asked to edit, tighten, or de-AI existing text. Covers what to include, how sentences carry meaning, and the machine-writing habits to avoid.
---

# Writing for humans

Three layers, applied in order: decide what to say, build sentences that carry it, and strip the habits that mark text as machine-written. The first two come from Joseph Williams (*Style: Toward Clarity and Grace*) and Bent Flyvbjerg (*How Big Things Get Done*); the third is a field guide to your own reflexes.

## 1. What to say

Work right to left from the reader. Before drafting, answer: who reads this, and what will they do after? Lead with that. A status report leads with the blocker. A PR body leads with what the reviewer must check. A design doc leads with the decision it asks for. Background comes after the payload, for readers who want it.

The cut test: if removing a sentence would leave the reader's next action unchanged, remove it. Most drafts shrink by half under this test and lose nothing.

Drafts are cheap; a delivered document is expensive to walk back. Restructure while it is still a draft — moving a section costs seconds now and an erratum later. When the structure feels wrong, fix the structure; polishing sentences inside a broken outline is wasted work.

In plans and reports, write what is true. State risks, misses, and actuals plainly, with numbers where you have them. A plan that reads like a best case is a forecast error waiting to be discovered by someone else.

## 2. How sentences work

- **Actors as subjects, actions as verbs.** e.g. "The parser rejects empty keys." When the verb has been buried in a noun (*rejection*, *implementation*, *utilization*), dig it out.
- **Familiar first, new last.** Open a sentence with what the reader already knows; put the new or complex material at the end, where the sentence's natural stress falls. This is also how paragraphs chain: the end of one sentence sets up the start of the next.
- **One point per paragraph, stated early.** The reader should be able to skim first sentences and get the argument.
- **Concision is deletion.** Cut metadiscourse ("it's worth noting that", "as mentioned above"), doubled words ("each and every"), and empty modifiers ("very", "quite", "essentially"). What survives, leave in full sentences — compression into fragments and arrow chains is a different vice.
- **Clarity is structural.** Complexity belongs in the content words, placed at the stress position; grammar that carries complexity makes the reader parse twice.
- **Vary sentence length.** A short sentence after two long ones lands hard. Uniform cadence reads as generated.

## 3. Machine habits to unlearn

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

**No comparison without data.** Nearly every comparison this reflex produces is contrived: neither half points at anything observable. Compare only when you can name the two real things being measured and the measurement. Otherwise use one of these:

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

### Hedged authority

The reflex: qualifying every claim to avoid being wrong. Stacked hedges ("it could potentially, in some cases..."), "arguably", both-sides paragraphs where one answer is correct, and ending with "ultimately, it depends" when it doesn't. Commit to the claim you can defend and state the actual uncertainty once, precisely: e.g. "untested above 10k rows."

## Edit pass

For cleaning existing text, in order:

1. Delete every sentence that fails the cut test (§1).
2. Find each list of three; check the facts. Merge, cut, or extend to the real count.
3. Find every comparison — `not `, `n't just`, `isn't about`, ` — it's `, `rather than`, `instead of`, `as opposed to`, and adjacent positive/negative sentence pairs. Keep only those backed by named, observable data; rewrite the rest as a precise positive, a reasoned failure mode, or a scope clause.
4. Delete filler-emphasis words or replace them with the earning fact.
5. Un-bullet anything that reads top-to-bottom; keep bullets only where the reader scans.
6. Rewrite nominalized sentences with actor-subject, action-verb.
7. Read for cadence; break up uniform sentence lengths and em-dash chains.
8. Cut the closing recap.
