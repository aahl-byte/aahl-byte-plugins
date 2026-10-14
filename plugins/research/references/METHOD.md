# The research method

This method stops one failure: a plausible number produced by broken reasoning. A spike that crashes costs nothing. A wrong result that reads as right costs whatever gets built on it. The likely causes are a wrong instrument, a silent bug, a test corpus too easy to fail, or a hypothesis that won because nobody looked for where it loses. One researcher working alone, motivated to produce an answer, produces exactly this failure and reports it with confidence.

Every rule below either makes a wrong result expensive to produce or catches it before it travels. The rules cost little when the work is sound. They get expensive only when something is wrong, and that is when they are meant to.

This file holds the method: the principles, the question schema, the roles, the pipeline, the tiers, the verdicts and the record. The skills hold the procedures:

- `research:setup` starts a programme.
- `research:coordinate` runs it.
- `research:run-spike` answers one question.
- `research:fold-result` takes a result into the record.
- `research:literature-scout` finds prior art for a question.
- `research:cloud-compute` rents machines.
- `research:create-expert` turns a domain's knowledge into a standing agent.

Paths in this file are the plugin's defaults. A project overrides them in `.claude/research.md`.

## Principles

**Ask questions, not tasks.** A task ("investigate FEM libraries") returns a literature dump. A question ("can we tet-mesh and solve a 5k-element assembly in under 5 s on a consumer GPU?") returns an answer something can be built on. A question that can't be answered yes or no, or with a number, isn't ready to be worked.

**Give each question several competing hypotheses, including a null.** The hypotheses are genuinely different approaches, not variants of one. An approach that loses overall often wins in one regime, and where each one wins is the real output. The null says what the data look like if nothing works, so a positive result has something to beat.

**Write the falsifiable criterion before the spike runs.** A criterion is a measurable pass or fail, with numbers wherever numbers exist. One written after seeing the result is a rationalisation.

**Order by kill-risk.** Kill-risk measures how much of the project dies, or must be redesigned, if the answer comes back bad. It does not measure how likely a bad answer is. Build order doesn't matter during research. The bottom of the stack is usually the part already known to work.

**Keep questions independent.** A question that can only start once three others have landed is a downstream consequence, not yet a research question. Split it until the pieces can run today, in parallel.

**Expect a mosaic.** A hypothesis wins for a domain, not globally. The end state is assembled from what each spike proved, one approach per regime.

## The question schema

A question enters the catalogue before anything runs, and every entry has this shape:

```markdown
### [AREA-N] One-sentence question, answerable yes/no or with a number
- **Kills:** what dies or must be redesigned if the answer is bad
- **Kill-risk:** high | medium | low
- **Hypotheses:**
  - *H0 — null:* what the data show if no approach works
  - *H1 — short name:* the approach, and its expected failure mode
  - *H2 — short name:* a genuinely different approach
- **Falsifiable criterion:** measurable pass/fail, with numbers, populations and units
- **Spike:** what to build or run to get the answer, and its rough size
- **Independent?** yes, or the questions it must follow
```

A question is disqualified in three cases: a researcher would have to ask a clarifying question before starting; its criterion has no number where one is possible; or its hypotheses are the same idea wearing different hats.

Follow-up questions are named after the spike that raised them, never with the next free integer. `AREA-6` raises `AREA-6a` and `AREA-6b`, and `AREA-6a` raises `AREA-6a-a`. Concurrent spikes all read the same stale catalogue, so several of them would pick the same "next" number and collide. A suffix derived from the spike's own ID can't collide.

## Roles

Each role exists because someone else has to check the work of the role before it. Their permissions are deliberately unequal.

| Role | Does | Never does |
|---|---|---|
| **Coordinator** (one session) | Owns the catalogue, the rulings, every lease and every commit. Freezes criteria, launches long jobs, folds results. | Writes a spike's code, or audits a criterion it drafted |
| **Runner** (one per spike) | Plans, pre-registers, builds the instrument, runs it, writes the record | Stages, commits, leases, edits the catalogue, or writes outside its spike directory and its one result file |
| **Criterion auditor** | Attacks the hypothesis list and the criterion before anything is built | Runs the experiment or writes code |
| **Reviewer** | Attacks a finished result, and runs its own checks to do it | Modifies anything the spike owns |
| **Literature scout** | Returns lead cards on prior art for one question | Edits a criterion, a spike or the catalogue |
| **Domain expert** | Answers from its own store of measured facts, where the domain is contested | Answers a number it didn't measure as if it had |

The runner can't commit because concurrent staging has taken a commit off a branch and swept another agent's files into an unrelated commit. The runner can't lease because a subagent that backgrounds a job and ends its turn never wakes up to stop the machine.

## The pipeline

Each step exists because the step after it needs it. The kill-risk tier (below) decides which of the optional steps run.

1. **Catalogue the question** in the schema above. *Coordinator.*
2. **Scout prior art.** The literature scout returns at most about six lead cards. The planner and the criterion auditor read them before gate 1. *Scout, then coordinator.*
3. **Plan right to left** (`thinking:right-to-left`): the end state as checks someone else can run, each step justified by what consumes it. The runner drafts the pre-registration. This draft is **gate 1**. *Runner.*
4. **Step-0 criterion audit** by an agent that didn't write the plan. It checks the criterion against every class in `CRITERION_AUDIT.md`, simulates false-fail and false-pass rates where it can, and returns repaired text. The coordinator saves the audit verbatim. *Criterion auditor.*
5. **Rule on the audit**, in dated sections of the rulings file: accept, accept amended, or reject, each with its reason. The runner applies the rulings as a new revision. *Coordinator, then runner.*
6. **Freeze.** The runner hands back a diff and a sha256. The coordinator reads the diff:
   - If the diff holds only the ruled text, the pre-registration freezes.
   - If it adds anything beyond that, the auditor checks those lines first.

   The sha256 goes into a `.sha256` file beside the frozen document and into the rulings. *Coordinator.*
7. **Build the instrument red-first.** Every oracle, guard and planted fault has a mutant that turns its test red for the right reason. The runner reports the mutation tally on the final tree. *Runner.*
8. **Run.** The runner builds and tests in the foreground, then stops. The coordinator launches long jobs: locally, detached; in the cloud, through the `gpu` CLI. The runner stays idle while compute runs and is resumed by message when it lands. *Coordinator.*
9. **Check the outputs' integrity:**
   - every unit is present and verified;
   - lock or version checks pass;
   - each machine has a parity line;
   - any chain that claims to resume has survived a deliberate kill-and-resume.

   *Runner.*
10. **Grade exactly as frozen.** Nothing is repaired after the gate. A failure becomes the finding, and the repair becomes a new question. *Runner.*
11. **Review by kill-risk tier.** Each review is saved verbatim. The runner applies the reviewers' replacement text word for word. Where reviews disagree, the coordinator rules which side to take, and why. *Reviewers, runner, coordinator.*
12. **Fold:**
    - interrogate the result;
    - re-derive one load-bearing number from raw data, without the spike's own code;
    - run an impact audit on any defect found in something inherited;
    - copy the verdict exactly;
    - attach the regime to every claim;
    - add the new questions under the names the spike gave them, and scout each one;
    - move bulky data to scratch with a sha256 listing;
    - commit named paths only, after reading the staged diff.

    *Coordinator.*

## Tiers

The kill-risk tier sets how much scrutiny a spike gets. These are the defaults; a project can change them in its config.

| Kill-risk | Step-0 audit | Reviewers |
|---|---|---|
| low | optional | none required. One is still worth running when other spikes will inherit the numbers. |
| medium | required | one |
| high | required | two, on different briefs. One takes construct and consumers. The other takes implementation, and re-derives from raw data without the spike's own library. |

**Replication is reserved for spikes whose instrument is the deliverable**: a solver, sampler or scorer that other spikes will inherit. A second researcher gets the question and the criterion only, never the first one's code, predictions or result. Replication catches idiosyncratic error. It is blind to an error in a framing both researchers inherited, because two of them reaching for the same textbook closed form will reproduce the same mistake. Agreement shows that the method is reproducible; it doesn't show that the answer is right. Where the reviewer and the replicator conflict, the reviewer outranks the replicator.

## Verdicts

Every result carries exactly one verdict, chosen by its trigger:

| Verdict | Trigger |
|---|---|
| `answered` | The criterion was evaluated as frozen, every instrument oracle passed, the verdict holds across the sweep's plausible range, and the review tier is satisfied. |
| `answered-narrow` | All of the above, but only inside a stated regime. The regime goes in the verdict line. |
| `inconclusive` | The instrument passed and the criterion ran, but it didn't discriminate. This includes three cases: the verdict flips inside the plausible range of a guessed parameter; a frozen inconclusive trigger fired; a metric oracle exposed a defective criterion. |
| `instrument-failed` | An instrument oracle failed, or the one diagnosed repair failed. No measurement exists. |
| `blocked` | The spike couldn't run. Name what blocked it. |

Evaluate every trigger in the frozen stopping rule literally, and quote it, before drafting a verdict. An agent asked for an answer will produce one, so making "no answer" cheap is what keeps the other verdicts meaningful. A negative result is a successful spike.

**A negative result about the specimen has to clear the instrument first, in the specimen's own regime.** "The effect is not there", "these arms do not separate" and "this does not converge" are claims that a broken instrument produces as readily as the world does. Before recording one, show the instrument returning a known answer at the settings the negative came from.

## The record

Experiments are never deleted. Code, seeds, data and write-ups are kept, including for failed, abandoned and superseded spikes. A superseded experiment is marked as superseded at the top of its record. A number nobody can re-derive is a rumour.

```
<spikes>/<id>/
  PREREGISTRATION.md      the frozen prior: criterion, predictions, oracles. Never edited after the freeze.
  PREREGISTRATION.sha256  the frozen file's hash
  PREREGISTRATION_ADDENDUM_<n>.md (+ .sha256)   a repair or criterion change, audited and frozen like the original
  EXPERIMENT.md           the full auditable record, written during and after the run
  audit/                  each audit verbatim, plus COORDINATOR_RULINGS.md
  review-<x>/             each review verbatim, plus the reviewer's own scripts
  BULK_MOVED.txt          what moved to scratch, with sha256 and size per file
  run.sh                  one command that re-runs everything
<results>/<ID>.md         the short answer: verdict, regime, consumers, new questions
```

The three documents have separate jobs:

- the pre-registration is what was believed beforehand;
- `EXPERIMENT.md` is what was done and found;
- the result file is what a catalogue reader needs.

Text repeated across them is a defect. The deviations section of `EXPERIMENT.md` is the first thing an auditor reads. A spike whose procedure drifted silently from its pre-registration has no standing.

Templates for every file are in `templates/` beside this one.

## The rules that carry the weight

These rules are what make a wrong result expensive. Generalising the method for a new project must not weaken any of them.

- **The criterion is audited by someone who didn't write it, before it freezes.**
- **Audits, reviews and rulings are saved verbatim.** The coordinator's ruling is a separate, dated section that quotes what it accepts.
- **Every oracle is mutation-tested.** An oracle that survives its own mutation constrains nothing.
- **Nothing is repaired after the gate.** A failure becomes the finding, and the repair becomes a new question.
- **An instrument gets one diagnosed repair.** If the repaired instrument fails, the verdict is `instrument-failed`.
- **A post-freeze change that touches the criterion goes to the auditor first.** A deviation never softens a frozen label.
- **At fold, the coordinator re-derives one load-bearing number without the spike's own code.** If it can't be re-derived from what was kept, that is the finding.
- **An impact audit fires when a defect is found, before anyone proves it mattered.**
- **The verdict is copied exactly. Every claim carries the regime it was measured in.**
- **Runners never stage, commit or lease. Experiments are never deleted.**
