---
name: run-spike
description: Answer one catalogued research question as its runner, under the protocol that makes a wrong result expensive — plan right to left, pre-register, pass the step-0 audit and freeze, build mutation-tested oracles red-first, hand long compute to the coordinator, grade exactly as frozen, survive adversarial review, and leave a record someone else can re-derive. Use whenever answering a catalogue question, designing or running an experiment, or acting as a spike runner.
---

# Run a spike

You answer one question from the catalogue and leave behind a record that lets someone else re-derive your conclusion. A spike that crashes costs nothing. The expensive failure is a plausible number produced by broken reasoning, and every step below exists to make that number expensive to produce.

The method is in `${CLAUDE_PLUGIN_ROOT}/references/METHOD.md` (the plugin root is two directories above this skill's base directory). It holds the schema, the tiers, the verdicts and the record layout. The templates are in `references/templates/`. Paths below are the defaults; `.claude/research.md` overrides them.

## Before starting

Read, in this order:

1. `.claude/research.md`: paths, tiers and the project notes.
2. Your catalogue entry. Grep for its heading, `### [<ID>]`, and read just that entry; the catalogue is long.
3. The entry's lead cards, if it has been scouted.
4. `METHOD.md` and the project's `CRITERION_AUDIT.md`.
5. The project brief, if the config names one.
6. The results, and the retained code, of every spike you build on.

Note the entry's kill-risk, which sets your tier. If your brief contradicts your catalogue entry, the brief is newer: entries are written once and go stale as decisions land. Say in your record which you followed.

## The rules for running as one of many

Spikes run concurrently. These rules hold whether or not anything else is running, and every one of them answers a failure that has already happened.

- **Write only in your spike directory, `<spikes>/<id>/`, and in your one result file, `<results>/<ID>.md`.** Read and import from other spikes freely; reusing a validated instrument is the point. Writing anywhere else corrupts whatever else is running.
- **Never stage or commit.** No `git add`, `commit`, `reset` or `checkout`, anywhere, including in a worktree of your own. Concurrent staging has taken a commit off a branch and swept another agent's files into an unrelated commit. The coordinator commits, in your tree if you have one.
- **Never change shared code from your spike.** If the spike needs a change to code other spikes import, hand it to the coordinator as engineering. It is made red-first and merged before your freeze.
- **Never edit the catalogue.** The coordinator folds your result into it.
- **Never lease, stop or SSH to a cloud machine.** One session owns the allowance the author granted it, plus every lease's deadlines and stops, and it outlives any agent (`METHOD.md`, Roles). You hand the coordinator a chain.
- **Detach any build or test you background**, with `setsid nohup <cmd> > <spike>/logs/<name>.log 2>&1 < /dev/null &`, so a harness that kills its background tasks doesn't take it with them. Long compute goes to the coordinator.
- **Kill by PID, never `pkill -f`**, because the pattern matches your own shell. Check what else is running first.
- **Redirect long output to a file, never through a pipe.** A pipe buffers until it closes, so a slow job looks identical to a hung one.
- **Run long local jobs at `nice -n 19`** on shared machines.
- **Run mutation sweeps in a copy of the tree** whenever a live chain might be pushed from this one.
- **Name new questions after your own spike**: `<ID>a`, `<ID>b`. Never use the next free integer.
- **Set the model and effort explicitly on every agent you spawn**: Opus at `high` for judgement (planning, audits, reviews), Sonnet at `medium` for mechanical work, never Fable. Pass this rule into any brief you write.

## 1. Plan right to left

Load `thinking:right-to-left`. Write the end state as checks someone else could run, and justify each step by what consumes it. That end state and its derivation become your pre-registration draft.

## 2. Draft the pre-registration (gate 1)

Fill in `templates/PREREGISTRATION.md`. Its sections ask for:

- **A predicted number, with a range, for every hypothesis.** Predictions are the cheapest bug detector there is. Without a prior, a bug just looks like data.
- **What would falsify each hypothesis.** If nothing would, the hypothesis can't be tested.
- **The oracles, each labelled by kind.** The two kinds fail differently.
  - An *instrument oracle* checks the solver, simulator or sampler. If it fails, stop measuring: there is no measurement, only a bug. The instrument gets one diagnosed repair (step 6), and if that fails too, the verdict is `instrument-failed`.
  - A *metric oracle* checks the statistic the criterion is written in. If it fails while the instrument oracles pass, the instrument is sound and the criterion is defective. The verdict on that clause is `inconclusive`. Report the repaired statistic beside the original, ungraded; it goes to the auditor as a criterion-touching deviation, and the repair becomes a new question.

  Halting on a broken scoring rule throws away a working instrument. Continuing past a broken solver throws away the result.
- **The input range each oracle presents, beside the range the experiment will present.** Where the experiment's range is wider, extend the oracle or record the uncovered band as a blind spot. An instrument is often broken only on inputs its oracle never presents. *Example:* a stress recovery matched its oracle to 1.35% for the life of a spike, while returning up to 3.78× the true value on mesh nodes that the oracle's part never produced.
- **The gates, cheapest first, and what each run grades** (`METHOD.md`, Fail fast). Size each run from an estimate of how long the measured effect takes to appear, and cut any run that would grade nothing.
- **The stopping rule, with each verdict's trigger stated literally.** State what the verdict is if a blockable input stays blocked, and the futility rule: which reading, at which checkpoint, ends a run.
- **The consumers**: who inherits this result, and the statistic each of them reads.

Keep every revision as its own file, `PREREGISTRATION_r<n>.md`, until the freeze, so each diff can be shown. Nothing is committed until the coordinator freezes it.

The criterion freezes here. Softening it later to match what was achieved is how a research programme quietly stops meaning anything.

Hand the draft to the coordinator and end your turn. A criterion auditor who didn't write the plan attacks it; only at low kill-risk may the coordinator skip that, and the rulings say why. **Never audit your own criterion.** If no coordinator launched you, spawn `research:criterion-auditor` yourself, save its output verbatim in `audit/`, and record what you accepted and why.

## 3. Apply the rulings and hand back a diff

The coordinator rules on the audit in `audit/COORDINATOR_RULINGS.md`. Apply the rulings as a new revision, then hand back `diff -u` between the last two revisions and the new file's sha256. Put in only the ruled text. Anything you add beyond it goes back to the auditor before the freeze.

Then end your turn again. Build nothing until the coordinator resumes you with the freeze recorded, as `PREREGISTRATION.md` and `PREREGISTRATION.sha256`.

A finding that arrives after the freeze, from a lead card, a reviewer or your own data, never edits the frozen text. It becomes a deviation, a note, or a new question.

## 4. Build the instrument red-first

**Validate against oracles before measuring anything.** Run on cases whose answers are known independently: a closed form, an analytically solvable field, a corpus built to contain exactly *n* of the thing being counted. This step catches the most defects for the least effort.

**Mutation-test every oracle, guard and planted fault.** For each one, state what it would catch, introduce that fault (flip a sign, drop a term, shift an index), and confirm the test goes red for the right reason. An oracle that survives its own mutation is decoration: rewrite it or strike it. Oracles have been found that were built by the very predicate that scored them, or that exercised none of the code they claimed to validate. Report the mutation tally on the final tree.

**Assert the envelope on every measurement**, not just on oracle cases. Write the cheap invariants a wrong answer can't satisfy as assertions that always run:

- a smoothing step can't return a value outside the range it smooths;
- reactions balance applied load;
- a count found never exceeds the count present.

*Example:* one such comparison, a recovered 624.8 against a largest underlying sample of 310.4, would have fired on the first run of the stress-recovery spike above.

**Bin a spread against the instrument's own parameters before blaming the specimen.** A defect that looks like scatter is often a clean signal against the right covariate. The same recovery error read as noise until it was binned by elements per node, which gave 3.78×, 1.38×, 1.10× and 1.02×.

**Where the criterion uses a proxy, correlate it with its obvious confound** and report the number. A legibility metric that correlated 0.987 with "distance from the simplest arm" was measuring that distance.

## 5. Fail fast, then hand long compute to the coordinator

Spend seconds before anyone spends hours (`METHOD.md`, Fail fast):

1. Run every cheap gate, cheapest first, and stop at the first failure. A failed instrument oracle goes to its one repair; a failure the stopping rule says fixes the verdict ends production, unless a named consumer needs the data.
2. Pilot at about 1% of production, scored by the guards that grade production. A guard that refuses the pilot will refuse production, so take the redesign to the coordinator as a deviation instead of handing over.
3. Dry-run the whole chain with stub jobs in place of the real ones.

Then stop and hand over:

- the chain command;
- the output directory, a single subdirectory of your spike;
- the machine type and count;
- the wall time per machine;
- one job's peak memory;
- the gate results and the pilot's guard scores.

The chain must resume from its own checkpoints, write a done marker only on a clean exit, and run any parity check as its first unit. Kill it and resume it once at small scale before handing it over. The coordinator launches it (`research:cloud-compute` for leased machines) and resumes you by message when it lands. Do nothing while it runs.

## 6. Check integrity, then grade exactly as frozen

**Check integrity first:**

- every unit is present and verified;
- lock or version checks pass;
- each machine has a parity line: one fixed reference job's output, matching on every machine;
- the kill-and-resume test has passed.

**Then sweep.** Vary the least-certain parameters: resolution, timestep, sample count, corpus size. If the verdict flips inside the plausible range of a guessed parameter, the question isn't answered. A bare number with no sensitivity information isn't a result.

**Reconcile against your predictions.** A measurement far from every prediction is either a discovery or a defect. Decide which, in writing.

**Self-falsify.** Attack the surviving hypothesis and find where it breaks. "Wins below about 10k elements, degrades above" is usable. "H2 wins" is not.

**Nothing is repaired once grading starts.** A failure becomes the finding, and the repair becomes a new question.

Report every post-freeze change to the coordinator before you use it. The coordinator classifies it, and a doubtful one counts as criterion-touching. Deviations are of two kinds:

- *Operational* changes can't move a value: scheduling, slot counts, a memory cap, a hardware move with an identical parity line. Each is recorded with its reason.
- *Criterion-touching* changes alter what is measured or how it is judged. They go to the auditor before anyone uses them.

No deviation softens a frozen label.

**An instrument that fails its own validation gets one diagnosed repair**, before grading starts. Diagnose from retained data first, keep each bar's meaning, freeze the repair as an audited addendum, and validate it on fresh seeds. If the repaired instrument fails, the verdict is `instrument-failed`, spending stops, and the failure is the result.

**A negative result about the specimen has to clear the instrument first,** at the settings the negative came from. "The effect isn't there" is something a broken instrument produces on demand.

**A defect in anything you inherited triggers an impact audit.** That covers a solver, scorer, sampler or corpus. List in your record every retained result that passed through it, and report the defect and the list to the coordinator at once; the coordinator runs the audit (`research:fold-result`). The trigger is finding the defect, not proving it mattered. The blast radius often includes the result that caused your spike to exist.

## 7. Interrogate the conclusion before review

Ask three questions, and answer them in the record:

- **Does this spawn another experiment?** Answering one question usually raises several, so a finding that opens none is the suspicious case.
- **Did you work around a flaw instead of fixing it?** If so, what was the workaround hiding, and which recorded results came through it?
- **Did you make a stupid mistake somewhere?** Ask it plainly and go and look. Real answers from past spikes:
  - near-degenerate elements on one seam corrupting every patch there;
  - coordinates normalised by the whole mesh instead of the local patch;
  - a module that silently contributed nothing to a whole run;
  - a cache keyed without a fingerprint, reusing stale rows.

  A large finding with a mundane cause is the normal case.

**Check the conclusion against your own data.** The generalisation is written from the headline number, and the number that contradicts it usually sits in another section of your own record. **State the regime in the conclusion itself.**

## 8. Review before the write-up

At medium kill-risk and above, review comes before you polish anything. In the programme this method came from, fully written-up headlines were withdrawn or corrected on seven consecutive spikes, and prose built around an unattacked result makes it harder to give up.

The reviewer gets the code, the raw numbers and a one-paragraph claim. At high kill-risk, two reviewers work on different briefs. Whenever another spike will inherit your result, one reviewer takes the *consumer* brief and recomputes your headline at the consumer's operating point. After grading, end your turn and wait: the coordinator commissions the reviews and resumes you with them. If no coordinator launched you, spawn `research:spike-reviewer` yourself.

Apply word for word the replacement text the coordinator accepted. Where you dispute an attack, say why in your report; the coordinator rules. Record which attacks landed and which failed.

## 9. Write the record

- **`EXPERIMENT.md`**, from its template, written as you go. The deviations section comes first.
- **The result file**, from `templates/result.md`. The verdict follows the triggers in `METHOD.md`; quote each stopping-rule trigger and evaluate it before you write the verdict. New questions go in full catalogue schema, named after your spike. Anything a machine can't judge goes under **Needs a human**, with a time estimate.

Load `thinking:all` before writing anything a person will read.

## Report back

Report back with:

- the verdict, and its regime;
- the headline numbers;
- what you couldn't settle;
- the mutation tally;
- which reviewer attacks landed, which you dispute and why, and which failed;
- the new questions.

Keep it terse and dense with evidence. A negative result is a successful spike; making "no answer" cheap is what keeps the other verdicts meaningful.
