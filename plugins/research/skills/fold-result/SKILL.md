---
name: fold-result
description: Fold a returned spike result into the catalogue and the record as the coordinator — interrogate it, check it against its own data, re-derive a load-bearing number without the spike's code, send attacks back, run the impact audit, then copy the verdict exactly, attach the regime to every claim, add the new questions under the spike's names, move bulk data with a sha256 listing, and commit named paths. Use whenever a spike or an orchestrator reports a conclusion, before trusting any of it.
---

# Fold a result in

Nothing enters the catalogue until you have attacked it yourself. A report arrives written to persuade, from an agent that wanted to have answered the question, and it lands when you are deepest in context and least inclined to argue. That holds even when the spike ran its own review, because those reviewers were briefed by whoever framed the question.

**A pre-reviewed report needs more scrutiny.** A line like "review sent the first draft back on four attacks, and all four are reflected above" persuades, whatever else it does, and that review happened inside the spike's own frame. The defects it can't reach are the ones about what the result means outside that frame: how it generalises, what regime it holds in, and what it does at a consumer's operating point. Those are your ground. Treat the list of attacks it survived as a map of ground already covered, and spend your effort somewhere else.

Paths below are defaults; `.claude/research.md` overrides them. Work in the order given. The record edits are the cheap part, and making them early makes you reluctant to undo them.

## 1. Interrogate

Ask three questions:

- **Does this result spawn another experiment?** Answering a question usually raises several more, so a result that opens none is the suspicious case. It usually means the spike didn't look past its own criterion.
- **Did the spike work around a flaw in its own instrument, corpus or estimator instead of fixing it?** If so, ask what the workaround was hiding, and which recorded results came through it.
- **Did we make a stupid mistake somewhere?** Ask it plainly and go and look. A large finding with a mundane cause is the normal case: a cache keyed without a fingerprint, a module that silently contributed nothing, coordinates normalised by the wrong box. Check the boring explanation before accepting the interesting one.

## 2. Check the report against its own data

The generalisation is written from the headline measurement, and the number that contradicts it usually sits in a different section of the same report. Search for it. *Example:* one spike concluded that two operators were identical to five significant figures, from a clean test block. Four sections earlier it had recorded the same two differing by a factor of four at a seam. Both numbers were right; the generalisation was not.

Ask what regime each headline was measured in, and whether that regime includes the case the result will be applied to. Statistics are the usual tell. A median over all samples says little about a quantity defined as a maximum, because the max operator selects the extreme: a defect at one node in five thousand is noise to an average and the entire answer to a peak.

**Claims strengthen as they travel.** Compare the result file with `EXPERIMENT.md`, and `EXPERIMENT.md` with the raw data. *Example:* "the value is right" in a summary turned out to mean "the estimate is not certified" in the record, because the gate's own memory term let a stuck interface pass.

## 3. Re-derive one load-bearing number

Take the number the conclusion rests on, the one that will be quoted downstream, and re-derive it from the raw data, without any of the spike's code. It is usually a few minutes of work:

- a melting point from the replicates' own status files;
- a slope from the raw frames;
- an out-of-sample cost total from raw job records;
- a fitted gap refitted from raw energies.

That last case overturned a result that had already been folded.

If the number can't be re-derived from what was kept, that is the finding.

Save the script and its output in `<spikes>/<id>/fold/`, and cite them in the result file.

## 4. Send the attack back

Don't resolve an attack yourself. The spike has the instrument built and the context loaded, and "it holds anyway, here is why" from the researcher beats your guess. Resume the runner by message, wait for its answer, and record what changed. Reviewers supply replacement sentences, and the runner applies them word for word.

## 5. Run the impact audit

If anything shared turned out defective (a solver, scorer, sampler, corpus, or a reference another spike used), list every retained result that passed through it. For each one, either re-run it or write down why it is unaffected. Put a dated correction at the top of each affected result file.

**The trigger is discovering the defect, not proving it mattered.** "It probably didn't reach the conclusion" is exactly what the audit exists to check, and it is cheap, because every experiment is retained and re-runnable. The blast radius is usually wider than it feels, and it often includes the result that caused this spike to exist.

Record the instrument's hash with every number you re-grade. Re-grading old outputs under new code compares two instruments.

## 6. Only now, update the record

- **Copy the verdict exactly** from the result file. The verdict is the spike's, not yours. Upgrading `inconclusive` to `answered-narrow` during a fold has happened before. If the verdict looks wrong, send it back (step 4); don't edit it.
- **Attach the regime to every claim.** A conclusion measured on one clean case reads as general in the catalogue, and will be quoted as general.
- **Update the index row and the entry together:** the status, the kill-risk if the result changed it, and the pointer to the result file.
- **Change kill-risk only on evidence, and name the evidence.** Kill-risk has been raised on the size of a number before its cause was known, then lowered twice as the cause emerged. Ask why the number is what it is before rating it.
- **Check whether a direction audit is due** (`research:coordinate`): this fold killed or narrowed a question an end-state check depends on, or it is the fifth fold since the last audit. If one is due, run it before filing the new questions.
- **Add the new questions** as full entries plus index rows, keeping the names the spike gave them. Never renumber them to the next free integer. Scout each one (`research:literature-scout`).
- **Add any new defect class** the spike or its reviews found to the project's `CRITERION_AUDIT.md`, as a one-line lesson with its case.
- **Log the verdict in the todo store**, if the config names a `todo` item: one log line with the question ID, the verdict copied exactly, and the result path. Never mirror a verdict into a task's title or status; each copy is one more hand-off where a claim can strengthen.
- **Update the status document**, if `.claude/research.md` names one under `status:` and the result changes what is settled or what is blocked.

## 7. Move bulk data

Experiments are never deleted, but bulky files that no analysis or re-run reads can move to scratch: finished checkpoints, intermediate states nothing starts from, regenerable smoke outputs.

1. Move them to `<scratch>/<spike-id>/<same relative path>`.
2. Write `<spikes>/<id>/BULK_MOVED.txt`. The header says what moved, why, where it went, and what stayed in place on purpose. Then list one line per file: sha256, bytes and relative path.
3. Keep in place anything a reviewer or a resume reads.

```
# Files moved out of spikes/<id> because no analysis or re-run reads them: <what>.
# Destination: <scratch>/<id>/<same relative path>. Kept in place: <what, and why>.
# sha256  bytes  path
<sha256>  <bytes>  <relative path>
```

Generate the list with `sha256sum` and `stat`, before the move.

## 8. Commit

Stage named paths only: the spike directory (with its `fold/` re-derivation and its rulings), the result file, the catalogue, the defect catalogue, any leads batch files, and `<leads>/TALLY.md`. Never `git add -A`. Read the staged diff in full, then commit with the config's `commit_trailer`. Only the coordinator commits, because concurrent staging by agents has taken commits off branches.

Update the resume note.
